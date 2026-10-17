import type { TomatoState } from "./types";

export type TomatoMemory = { state: TomatoState; lastErrorKey: string | null };

export type TomatoReactionKind = "jump" | "flinch" | "rot" | "squish" | "lean";

export const STATUS_LINES: Record<TomatoState, string> = {
  0: "your tomato is looking fresh today",
  1: "your tomato is looking a little sad",
  2: "your tomato needs some right answers",
  3: "your tomato has seen better days",
};

export const TAP_LINES = [
  "hehe, that tickles",
  "okay, let's do some physics!",
  "ready when you are",
  "arre, careful with the pen",
  "poke me after you circle something",
];

const clamp = (n: number) => Math.max(0, Math.min(3, n)) as TomatoState;

/** Wrong answer: flinch. Repeating the same mistake rots one state. */
export function onWrong(m: TomatoMemory, errorKey: string | null): { next: TomatoMemory; reaction: TomatoReactionKind } {
  const repeat = errorKey != null && errorKey === m.lastErrorKey;
  return {
    next: { state: repeat ? clamp(m.state + 1) : m.state, lastErrorKey: errorKey },
    reaction: repeat ? "rot" : "flinch",
  };
}

/** Right answer: jump and recover one state. */
export function onRight(m: TomatoMemory): { next: TomatoMemory; reaction: TomatoReactionKind } {
  return { next: { state: clamp(m.state - 1), lastErrorKey: null }, reaction: "jump" };
}
