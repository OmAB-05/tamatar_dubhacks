"use client";

import { useEffect, useState } from "react";
import Tomato from "@/components/Tomato";
import { load, save } from "@/lib/storage";
import { VoicePlayer, type VoiceState } from "@/lib/voice";

/** Reads exactly the revealed explanation; never reveals higher help levels. */
export default function TamatarAgent({ explanation }: { explanation: string }) {
  const [voice, setVoice] = useState<VoiceState>({ status: "idle" });
  const [player] = useState(() => new VoicePlayer(setVoice));
  const [autoRead, setAutoRead] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAutoRead(load("voiceAutoRead", true));
    setReady(true);
    return () => player.dispose();
  }, [player]);

  useEffect(() => {
    if (ready && autoRead) void player.speak(explanation);
    return () => player.stop();
  }, [explanation, autoRead, ready, player]);

  const talking = voice.status === "speaking";
  const loading = voice.status === "loading";
  const paused = voice.status === "paused";

  return (
    <div className="mt-3 border-t border-dashed border-[rgba(31,26,23,.2)] pt-2" aria-label="Tamatar voice agent">
      <div className="flex items-center gap-2">
        <Tomato size={46} interactive={false} listen={false} track={false} speaking={talking} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[0.9rem] text-tomato">
            tamatar
            {talking && <span className="voice-wave" aria-hidden="true"><i /><i /><i /><i /></span>}
          </div>
          <div role="status" className="text-[0.7rem] text-ink-2">
            {loading ? "finding my voice…" : talking ? "let's work through this" : paused ? "take your time" : "your note, out loud"}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-red wa !min-h-[2.3rem] !px-3 !text-[0.8rem]"
          aria-label={loading ? "Cancel speech" : talking ? "Pause explanation" : paused ? "Resume explanation" : "Listen to explanation"}
          onClick={() => {
            if (loading) player.stop();
            else if (talking) player.pause();
            else if (paused) void player.resume();
            else void player.speak(explanation);
          }}
        >
          {loading ? "cancel" : talking ? "pause" : paused ? "resume" : "listen"}
        </button>
        {(talking || paused) && (
          <button type="button" className="link text-[0.75rem] text-ink-2" onClick={() => void player.speak(explanation)}>
            start again
          </button>
        )}
      </div>
      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[0.7rem] leading-snug text-ink-2">
        <input
          type="checkbox"
          checked={autoRead}
          className="mt-0.5 accent-[var(--tomato)]"
          onChange={(event) => {
            setAutoRead(event.target.checked);
            save("voiceAutoRead", event.target.checked);
          }}
        />
        read new explanations aloud
      </label>
      {voice.error && <p role="alert" className="mt-2 break-words text-[0.7rem] leading-snug text-tomato">{voice.error}</p>}
    </div>
  );
}
