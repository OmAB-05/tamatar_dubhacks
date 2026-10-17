import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "./errors";
import type { Problem } from "./types";

// Signed references survive serverless requests without trusting browser edits.
function signingKey(): string {
  const key = process.env.PROBLEM_SIGNING_SECRET || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.GEMINI_API_KEY;
  if (!key) throw new AppError("not_configured", "A provider key or PROBLEM_SIGNING_SECRET is required for PDF import");
  return key;
}

function signature(payload: string): Buffer {
  return createHmac("sha256", signingKey()).update(payload).digest();
}

export function signProblem(problem: Problem): string {
  const payload = Buffer.from(JSON.stringify(problem)).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function readProblemToken(token: string, problemId: string): Problem {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra) throw new AppError("invalid_request", "Invalid imported problem");
  const expected = signature(payload);
  const received = Buffer.from(mac, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new AppError("invalid_request", "Imported problem was changed; import the PDF again");
  }
  const problem = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Problem;
  if (problem.id !== problemId) throw new AppError("invalid_request", "Imported problem does not match this submission");
  return problem;
}
