export type VoiceState = {
  status: "idle" | "loading" | "speaking" | "paused" | "error";
  error?: string;
};

// Only one tomato talks at a time, including the optional playful tomato lines.
let stopActivePlayer: (() => void) | null = null;

export class VoicePlayer {
  private audio: HTMLAudioElement | null = null;
  private controller: AbortController | null = null;
  private generation = 0;
  private cached: { text: string; url: string } | null = null;
  private cancel = () => this.stop();

  constructor(private onState: (state: VoiceState) => void) {}

  stop() {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
      this.audio = null;
    }
    if (stopActivePlayer === this.cancel) stopActivePlayer = null;
    this.onState({ status: "idle" });
  }

  pause() {
    this.audio?.pause();
    this.onState({ status: "paused" });
  }

  async resume() {
    if (!this.audio) return;
    await this.play(this.audio, this.generation);
  }

  private async play(audio: HTMLAudioElement, generation: number) {
    try {
      await audio.play();
      if (generation === this.generation) this.onState({ status: "speaking" });
    } catch (error) {
      if (generation !== this.generation) return;
      this.onState({
        status: "error",
        error: error instanceof Error && error.name === "NotAllowedError"
          ? "Tap listen to start my voice."
          : "The audio couldn't play. Tap listen to try again.",
      });
    }
  }

  async speak(text: string) {
    if (typeof window === "undefined" || !text.trim()) return;
    this.stop();
    stopActivePlayer?.();
    stopActivePlayer = this.cancel;
    const generation = this.generation;
    this.onState({ status: "loading" });

    try {
      if (this.cached?.text !== text) {
        const controller = new AbortController();
        this.controller = controller;
        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(typeof body?.error === "string" ? body.error : "My voice is unavailable. Try again.");
        }
        const blob = await response.blob();
        if (generation !== this.generation) return;
        if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("No audio arrived. Try again.");
        if (this.cached) URL.revokeObjectURL(this.cached.url);
        this.cached = { text, url: URL.createObjectURL(blob) };
      }
      if (generation !== this.generation || !this.cached) return;
      const audio = new Audio(this.cached.url);
      this.audio = audio;
      audio.onended = () => {
        if (generation === this.generation) this.onState({ status: "idle" });
      };
      audio.onerror = () => {
        if (generation === this.generation) this.onState({ status: "error", error: "The audio couldn't play. Try again." });
      };
      await this.play(audio, generation);
    } catch (error) {
      if (generation !== this.generation) return;
      this.onState({ status: "error", error: error instanceof Error ? error.message : "My voice is unavailable. Try again." });
    }
  }

  dispose() {
    this.stop();
    if (this.cached) URL.revokeObjectURL(this.cached.url);
    this.cached = null;
  }
}

// Preserve the existing opt-in for playful lines outside the explanation agent.
let playfulPlayer: VoicePlayer | null = null;
export async function speak(text: string) {
  if (process.env.NEXT_PUBLIC_VOICE !== "1" || typeof window === "undefined") return;
  playfulPlayer ??= new VoicePlayer(() => {});
  await playfulPlayer.speak(text);
}
