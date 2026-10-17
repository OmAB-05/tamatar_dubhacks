import { NextResponse, type NextRequest } from "next/server";
import { readProblemToken } from "@/lib/problem-token";
import { getProblem } from "@/data/problems";
import { aiConfig, getChecker, withDeadline } from "@/lib/ai/checker";
import { evalDebugEnabled, evalDebugHeaders } from "@/lib/ai/debug";
import { AppError, errorResponse } from "@/lib/errors";
import { decodePng } from "@/lib/image";
import { logRequest } from "@/lib/log";
import { CheckRequestSchema, validateCheck } from "@/lib/parse";
import { PROMPT_VERSION } from "@/lib/prompts";
import type { CheckResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keep above AI_TIMEOUT_MS and within the Vercel plan's limit.
export const maxDuration = 30;

const MAX_REQUEST_BYTES = 4_000_000; // Vercel caps function payloads at 4.5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const log: Record<string, unknown> = { route: "check", requestId, promptVersion: PROMPT_VERSION };
  // Dev-only eval hook: the model's transcription goes out in a header, never in the body.
  const debug = evalDebugEnabled(req.headers);
  let observed: string | null = null;

  try {
    // ---- Validate input before any paid call ----
    if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
      throw new AppError("payload_too_large", "Request body is too large");
    }
    const raw = await req.text();
    if (raw.length > MAX_REQUEST_BYTES) {
      throw new AppError("payload_too_large", "Request body is too large");
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new AppError("invalid_request", "Body must be JSON");
    }
    const parsed = CheckRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("invalid_request", parsed.error.issues[0]?.message ?? "Invalid CheckRequest");
    }
    const { imageBase64, problemId, part, isFinal = false, problemToken } = parsed.data;
    Object.assign(log, { problemId, part, isFinal });

    // Server-controlled reference: never trust a client-supplied answer.
    const problem = problemToken ? readProblemToken(problemToken, problemId) : getProblem(problemId);
    if (!problem) throw new AppError("unknown_problem", `Unknown problemId "${problemId}"`);
    const image = decodePng(imageBase64);
    Object.assign(log, { imageBytes: image.bytes, imageW: image.width, imageH: image.height });

    // ---- Model call with deadline + one bounded retry ----
    const { timeoutMs } = aiConfig();
    const checker = await getChecker();
    Object.assign(log, { provider: checker.provider, model: checker.model });

    const { value, attempts } = await withDeadline(
      timeoutMs,
      async (signal) => {
        const { result, usage } = await checker.check({ image, problem, part, isFinal, signal });
        observed = result.observed ?? null;
        // Validate inside the attempt so a contradictory answer gets the one retry.
        return { response: validateCheck(result), usage };
      },
      req.signal,
    );

    const body: CheckResponse = value.response;
    logRequest({
      ...log,
      status: 200,
      attempts,
      usage: value.usage,
      correct: body.correct,
      errorKey: body.errorKey,
      elapsedMs: Date.now() - started,
    });
    const headers: Record<string, string> = { "x-request-id": requestId };
    if (debug) {
      Object.assign(
        headers,
        evalDebugHeaders({ provider: checker.provider, model: checker.model, promptVersion: PROMPT_VERSION, observed }),
      );
    }
    return NextResponse.json(body, { headers });
  } catch (err) {
    const res = errorResponse(err, requestId);
    if (debug) {
      const info = { provider: log.provider as string | undefined, model: log.model as string | undefined };
      const extra = evalDebugHeaders({ ...info, promptVersion: PROMPT_VERSION, observed });
      for (const [k, v] of Object.entries(extra)) res.headers.set(k, v);
    }
    logRequest({
      ...log,
      status: res.status,
      errorCode: err instanceof AppError ? err.code : "unexpected",
      errorMessage: err instanceof Error ? err.message : String(err),
      elapsedMs: Date.now() - started,
    });
    return res;
  }
}
