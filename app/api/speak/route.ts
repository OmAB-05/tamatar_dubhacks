import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_TEXT_LENGTH = 3000;
const MAX_BODY_LENGTH = 20_000;

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/** Speak the explanation already returned by Claude. Credentials stay on the server. */
export async function POST(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_LENGTH) {
    return fail("This explanation is too long to read aloud.", 413);
  }

  let text: string;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_LENGTH) return fail("This explanation is too long to read aloud.", 413);
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || !("text" in body) || typeof body.text !== "string") {
      return fail("An explanation is required.", 400);
    }
    text = body.text.trim();
    if (!text || text.length > MAX_TEXT_LENGTH) {
      return fail(`Use an explanation between 1 and ${MAX_TEXT_LENGTH} characters.`, 400);
    }
  } catch {
    return fail("Send the explanation as JSON.", 400);
  }

  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return fail("Tamatar's voice needs an ELEVENLABS_API_KEY on the server.", 503);
  const voice = process.env.ELEVENLABS_VOICE_ID?.trim() || "JBFqnCBsd6RMkjVDRZzb";
  const model = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: model }),
        signal: AbortSignal.any([req.signal, AbortSignal.timeout(20_000)]),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) {
        return fail("Tamatar couldn't access ElevenLabs. Check the server's voice API key and permissions.", 503);
      }
      if (response.status === 429) return fail("Tamatar's voice is busy or out of credits. Try again shortly.", 429);
      return fail("Tamatar couldn't make the audio. Check the ElevenLabs voice settings and try again.", 502);
    }
    if (!response.body || !response.headers.get("content-type")?.startsWith("audio/")) {
      await response.body?.cancel();
      return fail("Tamatar didn't receive any audio. Try again.", 502);
    }
    return new NextResponse(response.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return fail("Tamatar's voice couldn't connect in time. Try again.", 504);
  }
}
