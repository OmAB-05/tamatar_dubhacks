import type { Problem, Stroke } from "@/lib/types";

// The five demo ramp problems (context.md §9). g = 9.8 m/s², sin 30° = 0.5, cos 30° ≈ 0.866.
// Draft references: a second teammate must re-derive every number before the demo.

export const PROBLEMS: Problem[] = [
  {
    id: "ramp-frictionless",
    title: "Block on a frictionless ramp",
    text: "A 5 kg block is released from rest on a frictionless ramp inclined at 30° above the horizontal. Draw the free-body diagram of the block, then find its acceleration.",
    givenValues: { m: "5 kg", θ: "30°", g: "9.8 m/s²" },
    type: "inclined_plane",
    reference: {
      fbd: [
        "Exactly two forces act on the block:",
        "1. Gravity (weight) mg, pointing straight down (vertical), not perpendicular to the ramp.",
        "2. Normal force N, perpendicular to the ramp surface, pointing away from the surface.",
        "No friction (the ramp is frictionless). No 'force of motion' or 'net force' arrow; acceleration is not a force.",
      ].join("\n"),
      equations: [
        "Axes: x along the ramp (positive down the slope), y perpendicular to the ramp.",
        "1. Components of gravity: along the ramp mg sin θ, into the ramp mg cos θ.",
        "2. Perpendicular: N − mg cos θ = 0, so N = mg cos θ = 5 × 9.8 × 0.866 ≈ 42.4 N.",
        "3. Along the ramp (Newton's 2nd law): mg sin θ = ma.",
        "4. Solve: a = g sin θ = 9.8 × 0.5 = 4.9 m/s².",
        "Mass cancels; the answer does not depend on m.",
      ].join("\n"),
      finalAnswer: "a = 4.9 m/s² down the ramp",
    },
  },
  {
    id: "ramp-kinetic-friction",
    title: "Block sliding down a ramp with friction",
    text: "A 5 kg block slides down a ramp inclined at 30°. The coefficient of kinetic friction between the block and the ramp is μk = 0.2. Draw the free-body diagram of the block, then find its acceleration.",
    givenValues: { m: "5 kg", θ: "30°", μk: "0.2", g: "9.8 m/s²" },
    type: "inclined_plane",
    reference: {
      fbd: [
        "Exactly three forces act on the block:",
        "1. Gravity mg, straight down (vertical).",
        "2. Normal force N, perpendicular to the ramp, away from the surface.",
        "3. Kinetic friction fk, parallel to the ramp surface, pointing UP the slope (opposite the motion, which is down the slope).",
        "No 'force of motion' arrow.",
      ].join("\n"),
      equations: [
        "Axes: x along the ramp (positive down the slope), y perpendicular to the ramp.",
        "1. Perpendicular: N = mg cos θ = 5 × 9.8 × 0.866 ≈ 42.4 N.",
        "2. Friction: fk = μk N = μk mg cos θ = 0.2 × 42.4 ≈ 8.49 N.",
        "3. Along the ramp: mg sin θ − fk = ma, with mg sin θ = 5 × 9.8 × 0.5 = 24.5 N.",
        "4. Solve: a = g(sin θ − μk cos θ) = 9.8 × (0.5 − 0.2 × 0.866) = 9.8 × 0.327 ≈ 3.2 m/s².",
        "Friction is subtracted because it opposes the motion.",
      ].join("\n"),
      finalAnswer: "a ≈ 3.2 m/s² down the ramp",
    },
  },
  {
    id: "ramp-min-static-friction",
    title: "Block at rest on a ramp",
    text: "A 5 kg block sits at rest on a ramp inclined at 30°. Draw the free-body diagram of the block, then find the minimum coefficient of static friction μs that keeps it from sliding.",
    givenValues: { m: "5 kg", θ: "30°", g: "9.8 m/s²" },
    type: "inclined_plane",
    reference: {
      fbd: [
        "Exactly three forces act on the block:",
        "1. Gravity mg, straight down (vertical).",
        "2. Normal force N, perpendicular to the ramp, away from the surface.",
        "3. Static friction fs, parallel to the ramp, pointing UP the slope (it opposes the block's tendency to slide down).",
      ].join("\n"),
      equations: [
        "Axes: x along the ramp, y perpendicular to the ramp. The block is at rest, so a = 0.",
        "1. Perpendicular: N = mg cos θ ≈ 42.4 N.",
        "2. Along the ramp: fs = mg sin θ = 24.5 N.",
        "3. At the minimum μs, static friction is at its maximum: fs = μs N.",
        "4. So μs mg cos θ = mg sin θ, giving μs = tan θ = tan 30° ≈ 0.577.",
        "Mass cancels; μs has no units.",
      ].join("\n"),
      finalAnswer: "μs = tan 30° ≈ 0.58",
    },
  },
  {
    id: "ramp-horizontal-push",
    title: "Block pushed up a ramp by a horizontal force",
    text: "A 5 kg block on a frictionless ramp inclined at 30° is pushed by a horizontal force of 50 N directed toward the ramp, so the block moves up the slope. Draw the free-body diagram of the block, then find its acceleration.",
    givenValues: { m: "5 kg", θ: "30°", F: "50 N (horizontal)", g: "9.8 m/s²" },
    type: "inclined_plane",
    reference: {
      fbd: [
        "Exactly three forces act on the block:",
        "1. Gravity mg, straight down (vertical).",
        "2. Normal force N, perpendicular to the ramp, away from the surface.",
        "3. Applied force F, horizontal (parallel to the ground, NOT parallel to the ramp), pointing toward the ramp.",
        "No friction (the ramp is frictionless).",
      ].join("\n"),
      equations: [
        "Axes: x along the ramp (positive up the slope), y perpendicular to the ramp.",
        "1. Components of F: along the ramp F cos θ = 50 × 0.866 ≈ 43.3 N (up the slope); into the ramp F sin θ = 50 × 0.5 = 25 N.",
        "2. Components of gravity: along the ramp mg sin θ = 24.5 N (down the slope); into the ramp mg cos θ ≈ 42.4 N.",
        "3. Perpendicular: N = mg cos θ + F sin θ ≈ 42.4 + 25 = 67.4 N.",
        "4. Along the ramp: F cos θ − mg sin θ = ma, so 43.3 − 24.5 = 5a.",
        "5. Solve: a = 18.8 / 5 ≈ 3.76 m/s².",
      ].join("\n"),
      finalAnswer: "a ≈ 3.8 m/s² up the ramp",
    },
  },
  {
    id: "ramp-normal-force",
    title: "Normal force on a ramp",
    text: "A 10 kg block rests on a ramp inclined at 30°. Friction holds it in place. Draw the free-body diagram of the block, then find the normal force the ramp exerts on it.",
    givenValues: { m: "10 kg", θ: "30°", g: "9.8 m/s²" },
    type: "inclined_plane",
    reference: {
      fbd: [
        "Exactly three forces act on the block:",
        "1. Gravity mg, straight down (vertical).",
        "2. Normal force N, perpendicular to the ramp, away from the surface.",
        "3. Static friction fs, parallel to the ramp, pointing UP the slope.",
      ].join("\n"),
      equations: [
        "Axes: x along the ramp, y perpendicular to the ramp. No acceleration perpendicular to the ramp.",
        "1. The component of gravity into the ramp is mg cos θ (not mg, not mg sin θ).",
        "2. Perpendicular: N − mg cos θ = 0.",
        "3. Solve: N = mg cos θ = 10 × 9.8 × 0.866 ≈ 84.9 N.",
        "N is less than mg = 98 N because the ramp is tilted.",
      ].join("\n"),
      finalAnswer: "N ≈ 84.9 N, perpendicular to the ramp",
    },
  },
];

export function getProblem(id: string): Problem | undefined {
  if (id === "board") return {
    id: "board", title: "Scratch work", type: "inclined_plane", givenValues: {},
    text: "Review only the physics and mathematics visible on this scratch board. No assigned problem or reference answer is available. Do not assume a ramp or invent missing givens. If there is insufficient context to judge, report unreadable rather than guessing.",
    reference: { fbd: "Judge only forces whose physical context is visible.", equations: "Check only the written mathematical transitions and visible physical assumptions.", finalAnswer: "No reference answer. Do not invent a problem or a final answer." },
  };
  return PROBLEMS.find((p) => p.id === id);
}

export type Homework = {
  id: string;
  title: string;
  course: string;
  due: string | null; // null once turned in
  problems: Problem[];
};


export const RAMPS = PROBLEMS;
const ramp = (p: Omit<Problem, "type">): Problem => ({ ...p, type: "inclined_plane" });

const filler = (id: string, title: string, text: string): Problem =>
  ramp({ id, title, text, givenValues: {}, reference: { fbd: "", equations: "", finalAnswer: "" } });

export const HOMEWORK: Homework[] = [
  { id: "hw4", title: "HW 4 · Ramps", course: "Physics 121", due: "due Friday", problems: RAMPS },
  {
    id: "hw3",
    title: "HW 3 · Forces",
    course: "Physics 121",
    due: null,
    problems: [1, 2, 3, 4, 5].map((n) => filler(`f-${n}`, `Forces ${n}`, "Turned in.")),
  },
  {
    id: "hw2",
    title: "HW 2 · Kinematics",
    course: "Physics 121",
    due: null,
    problems: [1, 2, 3, 4].map((n) => filler(`k-${n}`, `Kinematics ${n}`, "Turned in.")),
  },
];

/** The seeded "Monday scratch" board: a wave and an equals sign, like the prototype. */
export const MONDAY_SCRATCH: Stroke[] = [
  {
    id: "seed-wave",
    tool: "pen",
    points: Array.from({ length: 60 }, (_, i) => {
      const x = 80 + i * 10;
      return [x, 260 - Math.sin(i / 7) * 70 - i * 0.6, 0.5];
    }),
  },
  { id: "seed-eq1", tool: "pen", points: [[740, 250, 0.5], [800, 248, 0.5], [860, 251, 0.5]] },
  { id: "seed-eq2", tool: "pen", points: [[740, 300, 0.5], [800, 302, 0.5], [860, 299, 0.5]] },
];
