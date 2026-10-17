import { mockCheck } from "./mock";
import { delay } from "./motion";
import type { BBox, CheckRequest, CheckResponse, Problem, ProblemPart } from "./types";

export const MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

/** Calls /api/check, or lib/mock.ts in mock mode. Falls back to mock after two API errors. */
export async function checkWork(
  req: CheckRequest,
  ctx: { problem: Problem | null; part: ProblemPart | "board"; attempt: number; bbox: BBox | null },
): Promise<CheckResponse> {
  if (MOCK) {
    await delay(2400);
    return mockCheck(ctx);
  }
  for (let tries = 0; tries < 2; tries++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return (await res.json()) as CheckResponse;
    } catch {
      /* retry, then fall back */
    }
  }
  return mockCheck(ctx);
}
