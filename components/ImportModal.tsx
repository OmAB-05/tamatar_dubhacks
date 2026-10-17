"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { RAMPS } from "@/data/problems";
import Button from "./Button";
import Modal from "./Modal";
import Tomato from "./Tomato";

const UNSUPPORTED = ["a pulley with two blocks (not yet supported)"];

/** Import modal: drop zone with marching ants, problems type themselves in (§4.5). Mock extract. */
export default function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [found, setFound] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set(RAMPS.map((_, i) => i)));

  useEffect(() => {
    if (!file) return;
    setFound(0);
    const t = setInterval(() => setFound((n) => (n >= RAMPS.length + UNSUPPORTED.length ? n : n + 1)), 450);
    return () => clearInterval(t);
  }, [file]);

  const take = (f?: File | null) => f && setFile(f.name);

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-[1.6rem]">Import problems</h2>
      {!file ? (
        <div
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl p-10 text-center transition-colors ${over ? "bg-blush" : ""}`}
          style={{
            backgroundImage: over
              ? "linear-gradient(90deg,var(--tomato) 50%,transparent 0),linear-gradient(90deg,var(--tomato) 50%,transparent 0),linear-gradient(0deg,var(--tomato) 50%,transparent 0),linear-gradient(0deg,var(--tomato) 50%,transparent 0)"
              : undefined,
            backgroundRepeat: "repeat-x, repeat-x, repeat-y, repeat-y",
            backgroundSize: "20px 3px, 20px 3px, 3px 20px, 3px 20px",
            backgroundPosition: "0 0, 0 100%, 0 0, 100% 0",
            animation: over ? "ants .6s linear infinite" : undefined,
            border: over ? "none" : "2.5px dashed var(--faint)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            take(e.dataTransfer.files[0]);
          }}
        >
          {over && (
            <div className="absolute -top-10 right-8">
              <Tomato size={56} interactive={false} listen={false} />
            </div>
          )}
          <div className="text-[1.15rem]">drop your homework PDF here</div>
          <Button onClick={() => input.current?.click()}>choose a file</Button>
          <input ref={input} type="file" accept="application/pdf" hidden onChange={(e) => take(e.target.files?.[0])} />
        </div>
      ) : (
        <div>
          <div className="mb-3 text-[0.85rem] text-muted">{file}</div>
          <div className="mb-2 text-[1.1rem]">{found >= RAMPS.length ? "Found four problems" : "reading your PDF…"}</div>
          <ul className="flex flex-col gap-2">
            {RAMPS.slice(0, found).map((p, i) => (
              <li key={p.id} className="bubble">
                <label className="flex cursor-pointer items-start gap-3 text-[0.85rem]">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 26 26"
                    className="mt-0.5 shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      setPicked((s) => {
                        const n = new Set(s);
                        n.has(i) ? n.delete(i) : n.add(i);
                        return n;
                      });
                    }}
                  >
                    <path d="M4 5 L21 3.5 L22 21 L3.5 22 Z" fill="#fff" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
                    {picked.has(i) && <path d="M7 13 L11 18 L20 6" pathLength={1} stroke="var(--tomato)" strokeWidth="2.6" fill="none" strokeLinecap="round" className="draw" style={{ ["--dur" as string]: "200ms" }} />}
                  </svg>
                  <span>
                    <span className="text-ink">{p.title}</span>
                    <span className="block text-muted">{p.text}</span>
                  </span>
                </label>
              </li>
            ))}
            {found > RAMPS.length &&
              UNSUPPORTED.map((u) => (
                <li key={u} className="bubble pl-9 text-[0.8rem] text-faint">
                  {u}
                </li>
              ))}
          </ul>
          <div className="mt-5 flex justify-between">
            <button type="button" className="link text-[0.9rem] text-muted" onClick={() => setFile(null)}>
              choose another file
            </button>
            <Button
              variant="red"
              disabledReason={found < RAMPS.length ? "still reading the PDF" : picked.size === 0 ? "pick at least one problem" : null}
              onClick={() => {
                onClose();
                router.push("/solve/hw4");
              }}
            >
              Create homework
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
