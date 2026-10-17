"use client";

import { useState } from "react";
import InkCanvas, { type LoopBox } from "@/components/InkCanvas";
import { useInk } from "@/lib/useInk";

const BW = 1000;
const BH = 380;

/** A real canvas: write anything, circle it, and the "Check this?" bubble pops (§3.3). */
export default function TryCircle() {
  const ink = useInk();
  const [loop, setLoop] = useState<LoopBox | null>(null);
  const [checked, setChecked] = useState(false);

  return (
    <div className="hand wc relative overflow-hidden">
      <InkCanvas
        ink={ink}
        w={BW}
        h={BH}
        placeholder="try it: write anything, then circle it"
        onStroke={() => setChecked(false)}
        onCircle={(b) => {
          setLoop(b);
          setChecked(false);
        }}
      >
        {loop && (
          <div
            className="absolute"
            style={{ left: `${((loop.x + loop.w) / BW) * 100}%`, top: `${(loop.y / BH) * 100}%`, translate: "8px -24px" }}
          >
            {checked ? (
              <span className="write-in inline-block text-[1.1rem] text-good" style={{ rotate: "-4deg", ["--steps" as string]: 20 }}>
                that&rsquo;s how you finish!
              </span>
            ) : (
              <button type="button" className="bubble btn btn-red wa !min-h-[40px] !text-[0.95rem]" onClick={() => setChecked(true)}>
                Check this?
              </button>
            )}
          </div>
        )}
      </InkCanvas>
      {ink.strokes.length > 0 && (
        <button
          type="button"
          className="link absolute bottom-3 right-4 text-[0.8rem] text-muted"
          onClick={() => {
            ink.clear();
            setLoop(null);
          }}
        >
          clear
        </button>
      )}
    </div>
  );
}
