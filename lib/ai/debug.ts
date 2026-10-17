import { createHash } from "node:crypto";
import type { CheckInput, Checker } from "@/lib/ai/checker";
import type { ModelCheck } from "@/lib/parse";

// Dev-only hooks for the eval harness in scripts/eval/ (dataset_strategy.md methods 1–2).
// Both are off unless explicitly enabled, and never active in production builds,
// so the CheckResponse body and the deployed API are unchanged.

const DEV = process.env.NODE_ENV !== "production";

/**
 * EVAL_DEBUG=1 on the server plus an `x-eval-debug: 1` request header returns the
 * model's `observed` transcription and the provider/model as response headers.
 */
export function evalDebugEnabled(headers: Headers): boolean {
  return DEV && process.env.EVAL_DEBUG === "1" && headers.get("x-eval-debug") === "1";
}

const MAX_OBSERVED_HEADER = 4000;

export function evalDebugHeaders(info: {
  provider?: string;
  model?: string;
  promptVersion: string;
  observed?: string | null;
}): Record<string, string> {
  const h: Record<string, string> = { "x-debug-prompt-version": info.promptVersion };
  if (info.provider) h["x-debug-provider"] = info.provider;
  if (info.model) h["x-debug-model"] = info.model;
  if (typeof info.observed === "string") {
    h["x-debug-observed"] = encodeURIComponent(info.observed).slice(0, MAX_OBSERVED_HEADER);
  }
  return h;
}

/** EVAL_MOCK_CHECKER=1 (dev only): no model call, no key, deterministic fake answers. */
export function mockCheckerEnabled(): boolean {
  return DEV && process.env.EVAL_MOCK_CHECKER === "1";
}

/**
 * Exercises the route, validation and the eval metrics without spending anything.
 * The answer depends only on a hash of the image, so it says nothing about the work:
 * about half the cases come back correct, half as a fixed sin/cos error.
 */
export class MockChecker implements Checker {
  readonly provider = "mock" as const;
  readonly model = "mock";

  async check({ image, part }: CheckInput) {
    const digest = createHash("sha256").update(image.base64).digest();
    const usage = { inputTokens: 0, outputTokens: 0, reasoningTokens: null };
    const observed = "mock checker: no transcription";
    if (digest[0] % 2 === 0) {
      const result: ModelCheck = {
        observed,
        readable: true,
        correct: true,
        errorStep: null,
        errorKey: null,
        bbox: null,
        mark: null,
        hint: null,
        explanation: null,
        fullSolution: null,
      };
      return { result, usage };
    }
    const result: ModelCheck = {
      observed,
      readable: true,
      correct: false,
      errorStep: part === "fbd" ? "Normal force drawn vertical" : "Used cos θ for the along-ramp component",
      errorKey: part === "fbd" ? "normal_force_direction" : "sin_cos_swap",
      bbox: { x: 0.05, y: 0.25, w: 0.4, h: 0.06 },
      mark: "Mock check",
      hint: "Mock hint.",
      explanation: "Mock explanation.",
      fullSolution: "Mock solution.",
    };
    return { result, usage };
  }
}
