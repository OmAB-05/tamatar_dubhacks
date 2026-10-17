import { AppError } from "@/lib/errors";
import type { ExtractModelOutput, ModelCheck } from "@/lib/parse";
import type { ValidImage } from "@/lib/image";
import type { Problem, ProblemPart } from "@/lib/types";

// Provider-independent boundary (backend_planning.md "Proposed code organization").
// Routes talk to these interfaces only; provider payloads, reasoning settings,
// and coordinate conventions stay inside each adapter.

export type Usage = {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
};

export type CheckInput = {
  image: ValidImage;
  problem: Problem;
  part: ProblemPart;
  isFinal: boolean;
  signal: AbortSignal;
};

export type ExtractInput = { pdfBase64: string; signal: AbortSignal };

export interface Checker {
  readonly provider: Provider | "mock"; // "mock": dev-only eval checker, lib/ai/debug.ts
  readonly model: string;
  check(input: CheckInput): Promise<{ result: ModelCheck; usage: Usage }>;
}

export interface Extractor {
  readonly provider: Provider;
  readonly model: string;
  extract(input: ExtractInput): Promise<{ result: ExtractModelOutput; usage: Usage }>;
}

// ---------- Configuration ----------

export type Provider = "anthropic" | "gemini";
export type Effort = "low" | "medium" | "high";

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-5-5",
  gemini: "gemini-3.8-flash",
};

function readProvider(name: string): Provider {
  const value = process.env[name] ?? process.env.AI_PROVIDER ?? "anthropic";
  if (value !== "anthropic" && value !== "gemini") {
    throw new AppError("not_configured", `${name} must be "anthropic" or "gemini"`);
  }
  return value;
}

export function aiConfig() {
  const checkProvider = readProvider("AI_CHECK_PROVIDER");
  const extractProvider = readProvider("AI_EXTRACT_PROVIDER");
  const effort = (process.env.AI_EFFORT ?? "low") as Effort;
  if (!["low", "medium", "high"].includes(effort)) {
    throw new AppError("not_configured", 'AI_EFFORT must be "low", "medium" or "high"');
  }
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? 20_000);
  return {
    check: { provider: checkProvider, model: process.env.AI_CHECK_MODEL || DEFAULT_MODELS[checkProvider] },
    extract: {
      provider: extractProvider,
      model: process.env.AI_EXTRACT_MODEL || DEFAULT_MODELS[extractProvider],
    },
    effort,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20_000,
  };
}

// ---------- Deadline + bounded retry ----------

// Don't start a second attempt with less time than this left.
const MIN_RETRY_BUDGET_MS = 4_000;

/**
 * One overall deadline with cancellation, and at most one retry for retryable
 * failures (malformed output, transient provider errors). SDK-level retries are
 * disabled in the adapters so retries don't multiply.
 */
export async function withDeadline<T>(
  deadlineMs: number,
  attempt: (signal: AbortSignal) => Promise<T>,
  outerSignal?: AbortSignal,
): Promise<{ value: T; attempts: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new AppError("timeout", "Check timed out")), deadlineMs);
  const onOuterAbort = () => controller.abort(outerSignal?.reason);
  outerSignal?.addEventListener("abort", onOuterAbort, { once: true });
  const started = Date.now();

  try {
    for (let attempts = 1; ; attempts++) {
      try {
        return { value: await attempt(controller.signal), attempts };
      } catch (err) {
        if (controller.signal.aborted) {
          throw controller.signal.reason instanceof AppError
            ? controller.signal.reason
            : new AppError("timeout", "Request was cancelled");
        }
        const remaining = deadlineMs - (Date.now() - started);
        const retryable = err instanceof AppError && err.retryable;
        if (!retryable || attempts >= 2 || remaining < MIN_RETRY_BUDGET_MS) throw err;
      }
    }
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}

// ---------- Factory ----------

export async function getChecker(): Promise<Checker> {
  const { check, effort } = aiConfig();
  const debug = await import("@/lib/ai/debug");
  if (debug.mockCheckerEnabled()) return new debug.MockChecker();
  if (check.provider === "gemini") {
    const { GeminiChecker } = await import("@/lib/gemini");
    return new GeminiChecker(check.model, effort);
  }
  const { ClaudeChecker } = await import("@/lib/anthropic");
  return new ClaudeChecker(check.model, effort);
}

export async function getExtractor(): Promise<Extractor> {
  const { extract, effort } = aiConfig();
  if (extract.provider === "gemini") {
    const { GeminiExtractor } = await import("@/lib/gemini");
    return new GeminiExtractor(extract.model, effort);
  }
  const { ClaudeExtractor } = await import("@/lib/anthropic");
  return new ClaudeExtractor(extract.model, effort);
}
