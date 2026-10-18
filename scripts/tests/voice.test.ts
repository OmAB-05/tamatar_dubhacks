import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/speak/route";
import { VoicePlayer, type VoiceState } from "../../lib/voice";

const request = (body: unknown) => new NextRequest("http://localhost/api/speak", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
});

function configure(t: TestContext) {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "test-key-never-return-to-client";
  t.after(() => {
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  });
}

test("speech validates input before making a paid request", async (t) => {
  configure(t);
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not call"); });
  for (const body of [{}, { text: 4 }, { text: " " }, { text: "x".repeat(3001) }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(request({ text: "x".repeat(20_001) }))).status, 413);
  assert.equal((await POST(new NextRequest("http://localhost/api/speak", { method: "POST", body: "{" }))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});

test("missing voice credentials produce an actionable error without calling ElevenLabs", async (t) => {
  configure(t);
  delete process.env.ELEVENLABS_API_KEY;
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("must not call"); });
  const response = await POST(request({ text: "The force points down the slope." }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /ELEVENLABS_API_KEY/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("speech forwards the note to ElevenLabs and returns private audio, never credentials", async (t) => {
  configure(t);
  const text = "The normal force is perpendicular to the slope.";
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.match(url, /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/.+\/stream\?output_format=mp3_44100_128$/);
    assert.equal(JSON.parse(String(options.body)).text, text);
    assert.equal(new Headers(options.headers).get("xi-api-key"), process.env.ELEVENLABS_API_KEY);
    assert.ok(options.signal);
    return new Response("test audio", { headers: { "Content-Type": "audio/mpeg" } });
  });
  const response = await POST(request({ text }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("xi-api-key"), null);
  assert.equal(await response.text(), "test audio");
});

test("provider failures are safe, actionable, and distinguish quota from configuration", async (t) => {
  configure(t);
  let status = 401;
  t.mock.method(globalThis, "fetch", async () => new Response("private provider error", { status }));
  for (const [upstream, expected] of [[401, 503], [403, 503], [429, 429], [500, 502]]) {
    status = upstream;
    const response = await POST(request({ text: "An explanation." }));
    assert.equal(response.status, expected);
    assert.doesNotMatch(await response.text(), /private provider error|test-key/);
  }
});

test("speech rejects a non-audio provider response", async (t) => {
  configure(t);
  t.mock.method(globalThis, "fetch", async () => new Response("{}", { headers: { "Content-Type": "application/json" } }));
  assert.equal((await POST(request({ text: "An explanation." }))).status, 502);
});

function browser(t: TestContext) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const audioDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  class AudioStub {
    static instances: AudioStub[] = [];
    static blocked = false;
    paused = true;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public src: string) { AudioStub.instances.push(this); }
    async play() {
      if (AudioStub.blocked) throw new DOMException("Requires a user gesture", "NotAllowedError");
      this.paused = false;
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ""; }
    load() {}
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: AudioStub });
  t.after(() => {
    if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
    else Reflect.deleteProperty(globalThis, "window");
    if (audioDescriptor) Object.defineProperty(globalThis, "Audio", audioDescriptor);
    else Reflect.deleteProperty(globalThis, "Audio");
  });
  return AudioStub;
}

test("playback can pause, resume and replay without buying the same audio twice", async (t) => {
  const AudioStub = browser(t);
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("audio", { headers: { "Content-Type": "audio/mpeg" } }));
  let state: VoiceState = { status: "idle" };
  const player = new VoicePlayer((next) => { state = next; });
  t.after(() => player.dispose());
  await player.speak("Read this note.");
  assert.equal(state.status, "speaking");
  player.pause();
  assert.equal(state.status, "paused");
  assert.equal(AudioStub.instances[0].paused, true);
  await player.resume();
  assert.equal(state.status, "speaking");
  await player.speak("Read this note.");
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(AudioStub.instances[0].paused, true);
  AudioStub.instances.at(-1)?.onended?.();
  assert.equal(state.status, "idle");
});

test("autoplay rejection offers manual playback and reuses the generated audio", async (t) => {
  const AudioStub = browser(t);
  AudioStub.blocked = true;
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response("audio", { headers: { "Content-Type": "audio/mpeg" } }));
  let state: VoiceState = { status: "idle" };
  const player = new VoicePlayer((next) => { state = next; });
  t.after(() => player.dispose());
  await player.speak("Read this note.");
  assert.equal(state.status, "error");
  assert.match(state.error ?? "", /Tap listen/);
  AudioStub.blocked = false;
  await player.speak("Read this note.");
  assert.equal(state.status, "speaking");
  assert.equal(fetch.mock.callCount(), 1);
});

test("cancelled and superseded requests never play late audio", async (t) => {
  const AudioStub = browser(t);
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | null = null;
  t.mock.method(globalThis, "fetch", (_url: string, options: RequestInit) => {
    signal = options.signal as AbortSignal;
    return new Promise<Response>((done) => { resolve = done; });
  });
  const first = new VoicePlayer(() => {});
  const second = new VoicePlayer(() => {});
  t.after(() => { first.dispose(); second.dispose(); });
  const late = first.speak("Old explanation.");
  const firstSignal = signal!;
  const resolveFirst = resolve;
  const latest = second.speak("New explanation.");
  assert.equal(firstSignal.aborted, true);
  resolveFirst(new Response("old audio", { headers: { "Content-Type": "audio/mpeg" } }));
  await late;
  assert.equal(AudioStub.instances.length, 0);
  second.stop();
  assert.equal(signal!.aborted, true);
  resolve(new Response("new audio", { headers: { "Content-Type": "audio/mpeg" } }));
  await latest;
  assert.equal(AudioStub.instances.length, 0);
});

test("disposing a player stops audio and releases its object URL", async (t) => {
  const AudioStub = browser(t);
  t.mock.method(globalThis, "fetch", async () => new Response("audio", { headers: { "Content-Type": "audio/mpeg" } }));
  const revoke = t.mock.method(URL, "revokeObjectURL", () => {});
  const player = new VoicePlayer(() => {});
  await player.speak("Read this note.");
  player.dispose();
  assert.equal(AudioStub.instances[0].paused, true);
  assert.equal(AudioStub.instances[0].src, "");
  assert.equal(revoke.mock.callCount(), 1);
});
