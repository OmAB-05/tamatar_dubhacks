import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { CheckInput, Checker, Effort, ExtractInput, Extractor, Usage } from "@/lib/ai/checker";
import { ExtractModelSchema, bboxFromPixels, checkCoreShape } from "@/lib/parse";
import { CHECK_SYSTEM, EXTRACT_SYSTEM, buildCheckPrompt } from "@/lib/prompts";

// Claude adapter. Default model: claude-sonnet-5-5 (override with AI_CHECK_MODEL /
// AI_EXTRACT_MODEL). Thinking is adaptive by default on Sonnet 5.5; depth is
// controlled with output_config.effort.

// Claude asks for corners in the image's own pixel space; we convert to fractions.
const ClaudeCheckSchema = z.object({
  ...checkCoreShape,
  box: z
    .object({ x0: z.number(), y0: z.number(), x1: z.number(), y1: z.number() })
    .nullable()
    .describe("Pixel corners (top-left x0,y0; bottom-right x1,y1) of the first mistake, or null."),
});

// Server-side refusal fallback ("default" routes by refusal category).
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      throw new AppError("not_configured", "ANTHROPIC_API_KEY is not set");
    }
    // Retries are owned by withDeadline(); don't let the SDK multiply them.
    client = new Anthropic({ maxRetries: 0 });
  }
  return client;
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new AppError("timeout", "Request was cancelled");
  if (err instanceof Anthropic.RateLimitError) return new AppError("rate_limited", "Claude rate limit reached");
  if (
    err instanceof Anthropic.AuthenticationError ||
    err instanceof Anthropic.PermissionDeniedError ||
    err instanceof Anthropic.NotFoundError
  ) {
    return new AppError("not_configured", `Claude rejected the key or model: ${err.message}`);
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new AppError("provider_error", `Claude rejected the request: ${err.message}`);
  }
  if (err instanceof Anthropic.InternalServerError || err instanceof Anthropic.APIConnectionError) {
    return new AppError("provider_error", "Claude is temporarily unavailable", true);
  }
  if (err instanceof Anthropic.APIError) {
    return new AppError("provider_error", `Claude error ${err.status ?? ""}`.trim(), (err.status ?? 0) >= 500);
  }
  // JSON/schema parse failures from messages.parse() land here.
  return new AppError("invalid_model_response", "Claude returned malformed output", true);
}

function usageOf(u: Anthropic.Beta.Messages.BetaUsage): Usage {
  const details = (u as { output_tokens_details?: { thinking_tokens?: number } | null })
    .output_tokens_details;
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    reasoningTokens: details?.thinking_tokens ?? null,
  };
}

function checkStop(stop: string | null): void {
  if (stop === "refusal") throw new AppError("provider_refused", "Claude declined this request");
  if (stop === "max_tokens") {
    throw new AppError("invalid_model_response", "Claude ran out of output tokens", true);
  }
}

export class ClaudeChecker implements Checker {
  readonly provider = "anthropic" as const;
  constructor(
    readonly model: string,
    private readonly effort: Effort,
  ) {}

  async check({ image, problem, part, isFinal, signal }: CheckInput) {
    const boxInstruction = `The image is ${image.width}×${image.height} pixels. Return "box" as pixel corners {x0, y0, x1, y1} with (0,0) at the top-left, or null when the work is correct.`;
    try {
      const response = await getClient().beta.messages.parse(
        {
          model: this.model,
          max_tokens: 8000,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          system: CHECK_SYSTEM,
          output_config: { effort: this.effort, format: betaZodOutputFormat(ClaudeCheckSchema) },
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/png", data: image.base64 } },
                { type: "text", text: buildCheckPrompt({ problem, part, isFinal, boxInstruction }) },
              ],
            },
          ],
        },
        { signal },
      );
      checkStop(response.stop_reason);
      const out = response.parsed_output;
      if (!out) throw new AppError("invalid_model_response", "Claude returned no parsed output", true);
      // "observed" makes the model read before judging. It stays on ModelCheck for the
      // eval debug header; validateCheck() never copies it into CheckResponse.
      const { box, ...rest } = out;
      return {
        result: { ...rest, bbox: box ? bboxFromPixels(box, image.width, image.height) : null },
        usage: usageOf(response.usage),
      };
    } catch (err) {
      throw toAppError(err);
    }
  }
}

export class ClaudeExtractor implements Extractor {
  readonly provider = "anthropic" as const;
  constructor(
    readonly model: string,
    private readonly effort: Effort,
  ) {}

  async extract({ pdfBase64, signal }: ExtractInput) {
    try {
      const response = await getClient().beta.messages.parse(
        {
          model: this.model,
          max_tokens: 16000,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          system: EXTRACT_SYSTEM,
          output_config: { effort: this.effort, format: betaZodOutputFormat(ExtractModelSchema) },
          messages: [
            {
              role: "user",
              content: [
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
                { type: "text", text: "Extract the supported problems from this PDF." },
              ],
            },
          ],
        },
        { signal },
      );
      checkStop(response.stop_reason);
      if (!response.parsed_output) {
        throw new AppError("invalid_model_response", "Claude returned no parsed output", true);
      }
      return { result: response.parsed_output, usage: usageOf(response.usage) };
    } catch (err) {
      throw toAppError(err);
    }
  }
}
