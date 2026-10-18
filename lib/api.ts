import { mockCheck } from "./mock";
import { delay } from "./motion";
import type { BBox, CheckRequest, CheckResponse, ExtractResponse, Problem, ProblemPart } from "./types";

export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

async function request<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || `Request failed (${res.status}). Please try again.`);
    return body as T;
  } catch (error) {
    if (ctrl.signal.aborted) throw new Error("This took too long. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Simulated feedback is available only when explicitly enabled. */
export async function checkWork(
  req: CheckRequest,
  ctx: { problem: Problem | null; part: ProblemPart | "board"; attempt: number; bbox: BBox | null },
): Promise<CheckResponse> {
  if (MOCK) {
    await delay(2400);
    return mockCheck(ctx);
  }
  return request("/api/check", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req),
  }, 65_000);
}

export const UPLOAD_TYPES = "application/pdf,image/png,image/jpeg";

export async function extractProblems(file: File): Promise<ExtractResponse> {
  if (!UPLOAD_TYPES.split(",").includes(file.type) && !/\.(pdf|png|jpe?g)$/i.test(file.name)) {
    throw new Error("Upload a PDF, PNG or JPEG worksheet.");
  }
  if (file.size > 3_000_000) throw new Error("File must be under 3 MB.");
  const form = new FormData();
  form.set("file", file);
  return request("/api/extract", { method: "POST", body: form }, 65_000);
}
