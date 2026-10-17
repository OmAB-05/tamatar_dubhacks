import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Process health only: never calls a paid model or exposes configuration.
export function GET() {
  return NextResponse.json({ ok: true });
}
