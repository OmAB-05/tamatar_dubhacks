import { signProblem } from "@/lib/problem-token";
import { NextResponse, type NextRequest } from "next/server";
import { aiConfig, getExtractor, withDeadline, type UploadMediaType } from "@/lib/ai/checker";
import { AppError, errorResponse } from "@/lib/errors";
import { logRequest } from "@/lib/log";
import { toExtractResponse } from "@/lib/parse";
import { EXTRACT_PROMPT_VERSION } from "@/lib/prompts";
import type { ExtractResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Conservative demo limits (backend_planning.md "/api/extract — P1").
const MAX_PDF_BYTES = 3_000_000; // also the limit for worksheet photos
const MAX_PAGES = 10;
const EXTRACT_TIMEOUT_FLOOR_MS = 45_000;

/**
 * Best-effort page count from raw bytes. PDFs that store page objects inside
 * compressed object streams report 0 here and fall back to the byte limit.
 */
function countPages(buf: Buffer): number {
  return buf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
}

/** Trust the file's bytes, not its name or the browser's content type. */
function sniff(buf: Buffer): UploadMediaType | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const started = Date.now();
  const log: Record<string, unknown> = { route: "extract", requestId, promptVersion: EXTRACT_PROMPT_VERSION };

  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_PDF_BYTES + 100_000) {
      throw new AppError("payload_too_large", `File must be under ${MAX_PDF_BYTES / 1_000_000} MB`);
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new AppError("invalid_request", "Body must be multipart/form-data with a 'file' field");
    }
    const file = form.get("file");
    if (!(file instanceof Blob)) throw new AppError("invalid_request", "Missing 'file' field");
    if (file.size > MAX_PDF_BYTES) {
      throw new AppError("payload_too_large", `File must be under ${MAX_PDF_BYTES / 1_000_000} MB`);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mediaType = sniff(buf);
    if (!mediaType) throw new AppError("invalid_request", "File must be a PDF, PNG or JPEG");
    const pages = mediaType === "application/pdf" ? countPages(buf) : 1;
    Object.assign(log, { uploadBytes: buf.length, mediaType, pages });
    if (pages > MAX_PAGES) throw new AppError("payload_too_large", `PDF must have at most ${MAX_PAGES} pages`);

    const { timeoutMs } = aiConfig();
    const extractor = await getExtractor();
    Object.assign(log, { provider: extractor.provider, model: extractor.model });

    const { value, attempts } = await withDeadline(
      Math.max(timeoutMs, EXTRACT_TIMEOUT_FLOOR_MS),
      (signal) => extractor.extract({ base64: buf.toString("base64"), mediaType, signal }),
      req.signal,
    );

    const body: ExtractResponse = toExtractResponse(value.result);
    body.problems = body.problems.map((problem) => ({ ...problem, checkToken: signProblem(problem) }));
    logRequest({
      ...log,
      status: 200,
      attempts,
      usage: value.usage,
      problems: body.problems.length,
      unsupported: body.unsupported.length,
      figures: body.figures?.length ?? 0,
      elapsedMs: Date.now() - started,
    });
    return NextResponse.json(body, { headers: { "x-request-id": requestId } });
  } catch (err) {
    const res = errorResponse(err, requestId);
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
