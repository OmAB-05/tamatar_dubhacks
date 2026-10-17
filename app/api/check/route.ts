import type { CheckRequest } from "@/lib/types";

// Placeholder until the backend route lands (planning/backend). The UI falls back to
// lib/mock.ts when this errors, and uses the mock directly when NEXT_PUBLIC_MOCK=1.
export async function POST(req: Request) {
  const body = (await req.json()) as CheckRequest;
  return Response.json({ error: `check not implemented yet for ${body.problemId}` }, { status: 501 });
}
