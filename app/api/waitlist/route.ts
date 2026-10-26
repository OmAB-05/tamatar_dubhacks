import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

const signup = z.object({ email: z.string().trim().toLowerCase().max(254).email() });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Please join from our website." }, { status: 403 });
  }
  // Bound input before parsing, including requests without Content-Length.
  let body = "";
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const decoder = new TextDecoder();
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 2048) {
      await reader.cancel();
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  let parsed;
  try {
    parsed = signup.safeParse(JSON.parse(body));
  } catch {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "The waitlist is temporarily unavailable. Please try again soon." }, { status: 503 });
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await supabase.rpc("join_waitlist", { signup_email: parsed.data.email });
    if (error) {
      console.error("Waitlist insert failed", { code: error.code });
      return NextResponse.json({ error: "Could not save your email. Please try again soon." }, { status: 503 });
    }
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not connect. Please try again soon." }, { status: 503 });
  }
}
