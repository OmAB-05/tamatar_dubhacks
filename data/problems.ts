import type { Problem, Stroke } from "@/lib/types";

export type Homework = {
  id: string;
  title: string;
  course: string;
  due: string | null; // null once turned in
  problems: Problem[];
};

const ramp = (p: Omit<Problem, "type">): Problem => ({ ...p, type: "inclined_plane" });

export const RAMPS: Problem[] = [
  ramp({
    id: "ramp-1",
    title: "Block on a frictionless ramp",
    text: "A 5 kg block slides down a frictionless ramp tilted at 30°. Draw the forces on the block, then find its acceleration.",
    givenValues: { m: "5 kg", θ: "30°", g: "9.8 m/s²" },
    reference: {
      fbd: "gravity mg straight down; normal force N perpendicular to the ramp, pointing out of it",
      equations: "along the ramp: ma = mg sin θ\na = g sin θ = 9.8 × sin 30°\na = 4.9 m/s²",
      finalAnswer: "a = 4.9 m/s² down the ramp",
    },
  }),
  ramp({
    id: "ramp-2",
    title: "Block on a rough ramp",
    text: "The same 5 kg block now slides down a 30° ramp with μk = 0.20. Draw the forces, then find the acceleration.",
    givenValues: { m: "5 kg", θ: "30°", μk: "0.20" },
    reference: {
      fbd: "gravity mg down; normal N perpendicular out of the ramp; kinetic friction f up the ramp",
      equations: "N = mg cos θ\nf = μk N\nma = mg sin θ − f\na = g(sin θ − μk cos θ) ≈ 3.2 m/s²",
      finalAnswer: "a ≈ 3.2 m/s² down the ramp",
    },
  }),
  ramp({
    id: "ramp-3",
    title: "Block held by friction",
    text: "A 2 kg block sits at rest on a 20° ramp. Draw the forces, then find the friction force holding it in place.",
    givenValues: { m: "2 kg", θ: "20°" },
    reference: {
      fbd: "gravity mg down; normal N perpendicular out of the ramp; static friction f up the ramp",
      equations: "at rest, so forces balance along the ramp\nf = mg sin θ = 2 × 9.8 × sin 20°\nf ≈ 6.7 N",
      finalAnswer: "f ≈ 6.7 N up the ramp",
    },
  }),
  ramp({
    id: "ramp-4",
    title: "Pushed up the ramp",
    text: "A 3 kg block is pushed up a frictionless 25° ramp by a 20 N force parallel to the ramp. Draw the forces, then find the acceleration.",
    givenValues: { m: "3 kg", θ: "25°", F: "20 N" },
    reference: {
      fbd: "gravity mg down; normal N perpendicular out of the ramp; push F up along the ramp",
      equations: "ma = F − mg sin θ\na = 20/3 − 9.8 × sin 25°\na ≈ 2.5 m/s² up the ramp",
      finalAnswer: "a ≈ 2.5 m/s² up the ramp",
    },
  }),
];

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
