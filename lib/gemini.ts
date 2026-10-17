import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { CheckInput, Checker, Effort, ExtractInput, Extractor, Usage } from "@/lib/ai/checker";
import { ExtractModelSchema, bboxFromGemini, checkCoreShape } from "@/lib/parse";
import { CHECK_SYSTEM, EXTRACT_SYSTEM, buildCheckPrompt } from "@/lib/prompts";

// Gemini adapter. Default model: gemini-3.8-flash. Supports low/medium/high
// thinking (not minimal), structured JSON output, and PDF input.

// Gemini's native detection format: [ymin, xmin, ymax, xmax] on a 0–1000 grid.
const GeminiCheckSchema = z.object({
  ...checkCoreShape,
  box_2d: z
    .array(z.number())
    .nullable()
    .describe("[ymin, xmin, ymax, xmax] of the first mistake, normalized to 0-1000, or null."),
});

const THINKING: Record<Effort, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AppError("not_configured", "GEMINI_API_KEY is not set");
    // Retries are owned by withDeadline(); the SDK default is 5 attempts.
    client = new GoogleGenAI({ apiKey, httpOptions: { retryOptions: { attempts: 1 } } });
  }
  return client;
}

function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error && err.name === "AbortError") {
    return new AppError("timeout", "Request was cancelled");
  }
  if (err instanceof ApiError) {
    if (err.status === 429) return new AppError("rate_limited", "Gemini rate limit reached");
    if (err.status === 401 || err.status === 403 || err.status === 404) {
      return new AppError("not_configured", `Gemini rejected the key or model: ${err.message}`);
    }
    if (err.status >= 500) return new AppError("provider_error", "Gemini is temporarily unavailable", true);
    return new AppError("provider_error", `Gemini rejected the request: ${err.message}`);
  }
  if (err instanceof TypeError) {
    // fetch() network failures surface as TypeError.
    return new AppError("provider_error", "Could not reach Gemini", true);
  }
  return new AppError("invalid_model_response", "Gemini returned malformed output", true);
}

function parseJson<T>(response: GenerateContentResponse, schema: z.ZodType<T>): T {
  if (response.promptFeedback?.blockReason) {
    throw new AppError("provider_refused", "Gemini blocked this request");
  }
  const finish = response.candidates?.[0]?.finishReason;
  if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT" || finish === "RECITATION") {
    throw new AppError("provider_refused", `Gemini stopped generation (${finish})`);
  }
  if (finish === "MAX_TOKENS") {
    throw new AppError("invalid_model_response", "Gemini ran out of output tokens", true);
  }
  const text = response.text;
  if (!text) throw new AppError("invalid_model_response", "Gemini returned no text", true);
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new AppError("invalid_model_response", "Gemini output did not match the schema", true);
  }
  return parsed.data;
}

function usageOf(response: GenerateContentResponse): Usage {
  const u = response.usageMetadata;
  return {
    inputTokens: u?.promptTokenCount ?? null,
    outputTokens: u?.candidatesTokenCount ?? null,
    reasoningTokens: u?.thoughtsTokenCount ?? null,
  };
}

export class GeminiChecker implements Checker {
  readonly provider = "gemini" as const;
  constructor(
    readonly model: string,
    private readonly effort: Effort,
  ) {}

  async check({ image, problem, part, isFinal, signal }: CheckInput) {
    const boxInstruction =
      'Return "box_2d" as [ymin, xmin, ymax, xmax] normalized to 0-1000, or null when the work is correct.';
    try {
      const response = await getClient().models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/png", data: image.base64 } },
              { text: buildCheckPrompt({ problem, part, isFinal, boxInstruction }) },
            ],
          },
        ],
        config: {
          abortSignal: signal,
          systemInstruction: CHECK_SYSTEM,
          maxOutputTokens: 8000,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(GeminiCheckSchema),
          thinkingConfig: { thinkingLevel: THINKING[this.effort] },
        },
      });
      // "observed" stays on ModelCheck for the eval debug header; validateCheck() drops it.
      const { box_2d, ...rest } = parseJson(response, GeminiCheckSchema);
      return {
        result: { ...rest, bbox: box_2d ? bboxFromGemini(box_2d) : null },
        usage: usageOf(response),
      };
    } catch (err) {
      throw toAppError(err);
    }
  }
}

export class GeminiExtractor implements Extractor {
  readonly provider = "gemini" as const;
  constructor(
    readonly model: string,
    private readonly effort: Effort,
  ) {}

  async extract({ pdfBase64, signal }: ExtractInput) {
    try {
      const response = await getClient().models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
              { text: "Extract the supported problems from this PDF." },
            ],
          },
        ],
        config: {
          abortSignal: signal,
          systemInstruction: EXTRACT_SYSTEM,
          maxOutputTokens: 16000,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(ExtractModelSchema),
          thinkingConfig: { thinkingLevel: THINKING[this.effort] },
        },
      });
      return { result: parseJson(response, ExtractModelSchema), usage: usageOf(response) };
    } catch (err) {
      throw toAppError(err);
    }
  }
}
