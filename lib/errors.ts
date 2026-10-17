import { NextResponse } from "next/server";

// Proposed error envelope (backend_planning.md "Failure handling"). Successful
// responses keep the agreed CheckResponse / ExtractResponse shapes untouched;
// this only covers non-2xx. Agree with the team before the UI depends on it.
export type ApiErrorBody = {
  error: { code: ErrorCode; message: string };
  requestId: string;
};

export type ErrorCode =
  | "invalid_request"
  | "unknown_problem"
  | "payload_too_large"
  | "unreadable_input"
  | "rate_limited"
  | "provider_error"
  | "provider_refused"
  | "invalid_model_response"
  | "timeout"
  | "not_configured";

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unknown_problem: 404,
  payload_too_large: 413,
  unreadable_input: 422,
  rate_limited: 429,
  provider_error: 502,
  provider_refused: 502,
  invalid_model_response: 502,
  timeout: 504,
  not_configured: 503,
};

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    // Whether one more provider attempt (inside the same deadline) could succeed.
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(err: unknown, requestId: string): NextResponse<ApiErrorBody> {
  const appErr =
    err instanceof AppError ? err : new AppError("provider_error", "Unexpected server error");
  return NextResponse.json(
    { error: { code: appErr.code, message: appErr.message }, requestId },
    { status: STATUS[appErr.code], headers: { "x-request-id": requestId } },
  );
}
