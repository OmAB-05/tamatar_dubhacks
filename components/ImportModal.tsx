"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { extractProblems, UPLOAD_TYPES } from "@/lib/api";
import { dueText, isoOf } from "@/lib/due";
import { cropFigures } from "@/lib/figures";
import { useStore } from "@/lib/store";
import type { Problem } from "@/lib/types";
import Button from "./Button";
import FigureImage from "./FigureImage";
import Modal from "./Modal";
import Tomato from "./Tomato";

/** Today in the student's own time zone, as YYYY-MM-DD (what <input type="date"> uses). */
const localToday = () => isoOf(new Date());

/** Import modal: drop a worksheet (PDF or photo); problems and their figures become the app's own worksheet. */
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
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const take = async (f?: File | null) => {
    if (!f) return;
    setFile(f.name);
    setReading(true);
    setError(null);
    setProblems([]);
    setUnsupported([]);
    try {
      const result = await extractProblems(f);
      // cut each problem's figures out of the upload so the worksheet keeps its pictures
      let figures = new Map<number, NonNullable<Problem["figures"]>>();
      try {
        figures = await cropFigures(f, result.figures ?? []);
      } catch {
        setError("Found the problems, but couldn't cut out the figures. You can still create the worksheet.");
      }
      setProblems(result.problems.map((p, i) => (figures.has(i) ? { ...p, figures: figures.get(i) } : p)));
      setUnsupported(result.unsupported);
      setPicked(new Set(result.problems.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this worksheet. Please try again.");
    } finally {
      setReading(false);
    }
  };

  const create = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const id = `hw-${crypto.randomUUID()}`;
      await store.addHomework({ id, title: file.replace(/\.(pdf|png|jpe?g)$/i, ""), course: "Your worksheet", due: dueText(dueDate), dueDate, problems: problems.filter((_, i) => picked.has(i)) });
      onClose();
      router.push(`/solve/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the worksheet. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-[1.6rem]">Upload a worksheet</h2>
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
          <div className="text-[1.15rem]">drop your worksheet here</div>
          <div className="text-[0.85rem] text-muted">PDF (up to 10 pages) or a photo · under 3 MB</div>
          <Button onClick={() => input.current?.click()}>choose a file</Button>
          <input ref={input} type="file" accept={UPLOAD_TYPES} hidden onChange={(e) => take(e.target.files?.[0])} />
        </div>
      ) : (
        <div>
          <div className="mb-3 text-[0.85rem] text-muted">{file}</div>
          <div className="mb-2 text-[1.1rem]">{reading ? "reading your worksheet and cutting out figures…" : `Found ${problems.length} problem${problems.length === 1 ? "" : "s"}`}</div>
          {error && <p role="alert" className="mb-3 text-tomato">{error}</p>}
          <ul className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto pr-1">
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
                  <span className="min-w-0">
                    <span className="text-ink">{p.title}</span>
                    {p.topic && <span className="text-faint"> · {p.topic}</span>}
                    <span className="block text-muted">{p.text}</span>
                    {!!p.figures?.length && (
                      <span className="mt-2 flex flex-wrap gap-2">
                        {p.figures.map((f) => (
                          <FigureImage key={f.src} figure={f} className="hand wa h-[5rem] max-w-[10rem] bg-white p-1" />
                        ))}
                      </span>
                    )}
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
          {!reading && problems.length > 0 && (
            <label className="mt-4 flex flex-wrap items-center gap-3 text-[1rem]">
              <span>when is it due?</span>
              <input
                type="date"
                required
                min={localToday()}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="hand wa bg-white px-3 py-1 text-[1rem] outline-none focus:border-tomato"
                aria-label="due date"
              />
              {dueDate && <span className="text-[0.8rem] text-muted">{"it'll show up on your calendar"}</span>}
            </label>
          )}
          <div className="mt-5 flex justify-between">
            <button type="button" className="link text-[0.9rem] text-muted" disabled={reading || saving} onClick={() => { setFile(null); setError(null); }}>
              choose another file
            </button>
            <Button
              variant="red"
              disabledReason={reading ? "still reading the worksheet" : saving ? "saving your worksheet…" : !problems.length || picked.size === 0 ? "pick at least one problem" : !dueDate ? "pick a due date" : dueDate < localToday() ? "pick a due date that hasn't passed" : null}
              onClick={create}
            >
              {saving ? "Saving…" : "Create worksheet"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
