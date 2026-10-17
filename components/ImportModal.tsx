"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { extractProblems } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Problem } from "@/lib/types";
import Button from "./Button";
import Modal from "./Modal";
import Tomato from "./Tomato";

/** Import modal: drop zone with live PDF extraction. */
export default function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [unsupported, setUnsupported] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const take = async (f?: File | null) => {
    if (!f) return;
    setFile(f.name);
    setReading(true);
    setError(null);
    setProblems([]);
    setUnsupported([]);
    try {
      const result = await extractProblems(f);
      setProblems(result.problems);
      setUnsupported(result.unsupported);
      setPicked(new Set(result.problems.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this PDF. Please try again.");
    } finally {
      setReading(false);
    }
  };

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
          <div className="mb-2 text-[1.1rem]">{reading ? "reading your PDF…" : `Found ${problems.length} supported problem${problems.length === 1 ? "" : "s"}`}</div>
          {error && <p role="alert" className="mb-3 text-tomato">{error}</p>}
          <ul className="flex flex-col gap-2">
            {problems.map((p, i) => (
              <li key={p.id} className="bubble">
                <label className="flex cursor-pointer items-start gap-3 text-[0.85rem]">
                  <input
                    type="checkbox"
                    aria-label={`Include ${p.title}`}
                    checked={picked.has(i)}
                    onChange={() => setPicked((s) => {
                      const next = new Set(s);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })}
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--tomato)]"
                  />
                  <span>
                    <span className="text-ink">{p.title}</span>
                    <span className="block text-muted">{p.text}</span>
                  </span>
                </label>
              </li>
            ))}
            {unsupported.map((u) => (
                <li key={u} className="bubble pl-9 text-[0.8rem] text-faint">
                  {u}
                </li>
              ))}
          </ul>
          <div className="mt-5 flex justify-between">
            <button type="button" className="link text-[0.9rem] text-muted" disabled={reading} onClick={() => { setFile(null); setError(null); }}>
              choose another file
            </button>
            <Button
              variant="red"
              disabledReason={reading ? "still reading the PDF" : !problems.length || picked.size === 0 ? "pick at least one problem" : null}
              onClick={() => {
                const id = `hw-${crypto.randomUUID()}`;
                store.addHomework({ id, title: file.replace(/\.pdf$/i, ""), course: "Imported homework", due: "ready to solve", problems: problems.filter((_, i) => picked.has(i)) });
                onClose();
                router.push(`/solve/${id}`);
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
