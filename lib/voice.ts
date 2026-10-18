// Tomato voice (delight.md §5). ElevenLabs plugs in here: set NEXT_PUBLIC_VOICE=1 and add an
// /api/speak route that takes { text } and returns audio (the key stays server-side).
// Until then this is a silent no-op, so every caller can already "speak".

const ON = process.env.NEXT_PUBLIC_VOICE === "1";
const cache = new Map<string, string>();
let current: HTMLAudioElement | null = null;

export async function speak(text: string) {
  if (!ON || typeof window === "undefined") return;
  try {
    let url = cache.get(text);
    if (!url) {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      url = URL.createObjectURL(await res.blob());
      cache.set(text, url);
    }
    current?.pause();
    current = new Audio(url);
    await current.play();
  } catch {
    /* sound is a bonus; never break the UI over it */
  }
}
