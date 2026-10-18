"use client";

import { useState } from "react";
import type { Homework } from "@/data/problems";
import { dueDate, isoOf } from "@/lib/due";
import { useStore } from "@/lib/store";

/** "change due date" link that opens an inline date picker for an uploaded worksheet. */
export default function DueDateEdit({ hw, className = "" }: { hw: Homework; className?: string }) {
  const { setDueDate, toast } = useStore();
  const current = dueDate(hw);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const today = isoOf(new Date());

  if (!open) {
    return (
      <button
        type="button"
        className={`link text-[0.85rem] text-muted ${className}`}
        onClick={() => {
          setValue(current ? isoOf(current) : "");
          setOpen(true);
        }}
      >
        {current ? "change due date" : "add a due date"}
      </button>
    );
  }

  const invalid = !value ? "pick a date" : value < today ? "pick a date that hasn't passed" : null;
  const save = async () => {
    if (invalid) return;
    setSaving(true);
    try {
      await setDueDate(hw.id, value);
      toast("due date moved. it's on your calendar");
      setOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "could not change the due date");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className={`flex flex-wrap items-center gap-2 text-[0.85rem] ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        type="date"
        required
        autoFocus
        min={today}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="hand wa min-h-[2rem] bg-white px-2 text-[0.9rem] outline-none focus:border-tomato"
        aria-label={`new due date for ${hw.title}`}
      />
      <button type="submit" className="link text-tomato disabled:opacity-50" disabled={!!invalid || saving} title={invalid ?? undefined}>
        {saving ? "saving…" : "save"}
      </button>
      <button type="button" className="link text-muted" disabled={saving} onClick={() => setOpen(false)}>
        cancel
      </button>
    </form>
  );
}
