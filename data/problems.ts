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

// ---------- Physics 121 worksheets beyond ramps ----------
// Original problems written to follow the UW Physics 121 topic order (kinematics → Newton's laws →
// energy and momentum → circular motion, gravity and rotation). g = 9.8 m/s² throughout.
// Diagrams are SVG in board units (1000×640), drawn under the student's ink like the ramp.

const INK = "#4a4340";
const FILL = "#fdecea";
const FONT = `font-family="Myfont, var(--font-my)" fill="${INK}"`;
const label = (x: number, y: number, t: string, size = 30) => `<text x="${x}" y="${y}" font-size="${size}" ${FONT}>${t}</text>`;

const PULL_SVG = [
  `<path d="M120 522 L880 522" stroke="${INK}" stroke-width="4"/>`,
  ...Array.from({ length: 19 }, (_, i) => `<path d="M${140 + i * 40} 524 l-18 22" stroke="${INK}" stroke-width="2" opacity=".5"/>`),
  `<rect x="380" y="400" width="180" height="120" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="4"/>`,
  `<path d="M560 440 L785 310" stroke="${INK}" stroke-width="3"/>`,
  `<circle cx="785" cy="310" r="7" fill="${INK}"/>`,
  `<path d="M560 440 L700 440" stroke="${INK}" stroke-width="2" stroke-dasharray="8 8" opacity=".6"/>`,
  `<path d="M630 440 A70 70 0 0 0 621 405" fill="none" stroke="${INK}" stroke-width="3"/>`,
  label(640, 430, "30°", 26),
  label(445, 470, "m", 30),
].join("");

const CABLES_SVG = [
  `<rect x="150" y="90" width="50" height="200" fill="none" stroke="${INK}" stroke-width="4"/>`,
  `<rect x="800" y="90" width="50" height="200" fill="none" stroke="${INK}" stroke-width="4"/>`,
  `<path d="M200 160 L500 333 L800 160" fill="none" stroke="${INK}" stroke-width="3"/>`,
  `<circle cx="500" cy="333" r="6" fill="${INK}"/>`,
  `<path d="M500 333 L500 388" stroke="${INK}" stroke-width="3"/>`,
  `<path d="M462 388 L538 388 L560 440 L440 440 Z" fill="${FILL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  `<path d="M200 160 L310 160 M800 160 L690 160" stroke="${INK}" stroke-width="2" stroke-dasharray="8 8" opacity=".6"/>`,
  `<path d="M270 160 A70 70 0 0 1 261 195" fill="none" stroke="${INK}" stroke-width="3"/>`,
  `<path d="M730 160 A70 70 0 0 0 739 195" fill="none" stroke="${INK}" stroke-width="3"/>`,
  label(282, 196, "30°", 26),
  label(668, 196, "30°", 26),
].join("");

const ELEVATOR_SVG = [
  `<path d="M500 20 L500 80" stroke="${INK}" stroke-width="3"/>`,
  `<rect x="330" y="80" width="340" height="500" fill="none" stroke="${INK}" stroke-width="4"/>`,
  `<rect x="430" y="545" width="140" height="22" rx="4" fill="#fff" stroke="${INK}" stroke-width="3"/>`,
  `<rect x="450" y="365" width="100" height="180" rx="16" fill="${FILL}" stroke="${INK}" stroke-width="4"/>`,
  label(462, 465, "you", 28),
  label(700, 200, "a = 2.0 m/s² up", 28),
].join("");

const ATWOOD_SVG = [
  `<path d="M400 40 L600 40" stroke="${INK}" stroke-width="4"/>`,
  `<path d="M500 40 L500 140" stroke="${INK}" stroke-width="3"/>`,
  `<circle cx="500" cy="140" r="80" fill="none" stroke="${INK}" stroke-width="4"/>`,
  `<circle cx="500" cy="140" r="8" fill="${INK}"/>`,
  `<path d="M420 140 L420 330 M580 140 L580 400" stroke="${INK}" stroke-width="3"/>`,
  `<rect x="370" y="330" width="100" height="100" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="4"/>`,
  `<rect x="520" y="400" width="120" height="130" rx="6" fill="${FILL}" stroke="${INK}" stroke-width="4"/>`,
  label(398, 390, "m1"),
  label(556, 475, "m2"),
].join("");

const CURVE_SVG = [
  `<path d="M150 512 L850 512" stroke="${INK}" stroke-width="4"/>`,
  `<rect x="380" y="380" width="240" height="100" rx="14" fill="${FILL}" stroke="${INK}" stroke-width="4"/>`,
  `<path d="M430 380 L450 320 L550 320 L570 380" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
  `<circle cx="425" cy="490" r="22" fill="#fff" stroke="${INK}" stroke-width="4"/>`,
  `<circle cx="575" cy="490" r="22" fill="#fff" stroke="${INK}" stroke-width="4"/>`,
  label(110, 250, "← center of the curve", 28),
  label(420, 590, "(seen from behind)", 22),
].join("");

const solveOnly = (p: Omit<Problem, "type" | "parts">): Problem => ({ ...p, type: "general", parts: ["equations"] });
const withDiagram = (p: Omit<Problem, "type" | "parts">): Problem => ({ ...p, type: "general", parts: ["fbd", "equations"] });
const noDiagram = "No diagram part for this problem.";

export const KINEMATICS: Problem[] = [
  solveOnly({
    id: "kin-braking",
    topic: "Kinematics",
    title: "Braking to a stop",
    text: "A car traveling at 25 m/s brakes with constant acceleration and stops in 50 m. Find the car's acceleration and how long it takes to stop.",
    givenValues: { v0: "25 m/s", v: "0 m/s", Δx: "50 m" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Take the direction of motion as positive.",
        "1. Use v² = v0² + 2aΔx with v = 0: 0 = 25² + 2a(50).",
        "2. Solve: a = −625 / 100 = −6.25 m/s² (opposite the motion).",
        "3. Time from v = v0 + at: 0 = 25 − 6.25t, so t = 4.0 s.",
        "Check: Δx = average velocity × t = 12.5 × 4 = 50 m.",
      ].join("\n"),
      finalAnswer: "a = −6.25 m/s² (6.25 m/s² opposite the motion), t = 4.0 s",
    },
  }),
  solveOnly({
    id: "kin-toss-up",
    topic: "Kinematics",
    title: "Ball tossed straight up",
    text: "A ball is thrown straight up at 14.7 m/s from your hand. Ignoring air resistance, find the maximum height above your hand and the total time until it returns to your hand.",
    givenValues: { v0: "14.7 m/s up", g: "9.8 m/s²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Up is positive, so a = −g = −9.8 m/s².",
        "1. At the top v = 0: 0 = v0² − 2g h, so h = v0² / (2g) = 216.09 / 19.6 ≈ 11.0 m.",
        "2. Time to the top: t_up = v0 / g = 14.7 / 9.8 = 1.5 s.",
        "3. The motion is symmetric, so the total time is 2 × 1.5 = 3.0 s.",
      ].join("\n"),
      finalAnswer: "h ≈ 11.0 m, total time = 3.0 s",
    },
  }),
  solveOnly({
    id: "kin-cliff",
    topic: "Projectile motion",
    title: "Kicked off a cliff",
    text: "A ball is kicked horizontally at 12 m/s off the edge of a cliff 20 m high. How long is it in the air, and how far from the base of the cliff does it land?",
    givenValues: { vx: "12 m/s", h: "20 m", g: "9.8 m/s²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Horizontal and vertical motion are independent. The initial vertical velocity is 0.",
        "1. Vertical: h = ½ g t², so t = √(2h / g) = √(40 / 9.8) ≈ 2.02 s.",
        "2. Horizontal (no acceleration): x = vx t = 12 × 2.02 ≈ 24.2 m.",
      ].join("\n"),
      finalAnswer: "t ≈ 2.0 s, lands ≈ 24 m from the base",
    },
  }),
  solveOnly({
    id: "kin-launch-angle",
    topic: "Projectile motion",
    title: "Launch at an angle",
    text: "A ball is launched from level ground at 20 m/s, 30° above the horizontal. Find its time of flight, its maximum height and its range.",
    givenValues: { v0: "20 m/s", θ: "30°", g: "9.8 m/s²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "1. Components: vx = 20 cos 30° ≈ 17.3 m/s, vy = 20 sin 30° = 10 m/s.",
        "2. Time of flight: t = 2 vy / g = 20 / 9.8 ≈ 2.04 s.",
        "3. Maximum height: H = vy² / (2g) = 100 / 19.6 ≈ 5.10 m.",
        "4. Range: R = vx t = 17.3 × 2.04 ≈ 35.3 m (same as v0² sin 2θ / g).",
      ].join("\n"),
      finalAnswer: "t ≈ 2.04 s, H ≈ 5.1 m, R ≈ 35.3 m",
    },
  }),
];

export const FORCES: Problem[] = [
  withDiagram({
    id: "force-pull-angle",
    topic: "Newton's laws",
    title: "Pulling a box with a rope",
    text: "You pull a 10 kg box across a level floor with a rope that makes 30° above the horizontal. The tension in the rope is 40 N and the coefficient of kinetic friction is μk = 0.2. Draw the free-body diagram of the box, then find its acceleration.",
    givenValues: { m: "10 kg", T: "40 N at 30°", μk: "0.2", g: "9.8 m/s²" },
    diagramSvg: PULL_SVG,
    boardHint: "draw the forces on the box as arrows",
    reference: {
      fbd: [
        "Exactly four forces act on the box:",
        "1. Gravity mg, straight down.",
        "2. Normal force N, straight up from the floor.",
        "3. Tension T along the rope, 30° above the horizontal (up and to the right).",
        "4. Kinetic friction fk, horizontal, opposite the motion (to the left).",
      ].join("\n"),
      equations: [
        "Axes: x horizontal (positive in the direction of motion), y vertical.",
        "1. Vertical: N + T sin 30° − mg = 0, so N = 98 − 20 = 78 N (less than mg, the rope lifts a little).",
        "2. Friction: fk = μk N = 0.2 × 78 = 15.6 N.",
        "3. Horizontal: T cos 30° − fk = ma, so 34.6 − 15.6 = 10a.",
        "4. Solve: a ≈ 1.9 m/s².",
      ].join("\n"),
      finalAnswer: "a ≈ 1.9 m/s² in the direction of the pull",
    },
  }),
  withDiagram({
    id: "force-two-cables",
    topic: "Equilibrium",
    title: "A light hung from two cables",
    text: "A 10 kg light hangs at rest from two cables. Each cable makes 30° with the horizontal, as shown. Draw the free-body diagram of the light (treat the light and the knot as one object), then find the tension in each cable.",
    givenValues: { m: "10 kg", θ: "30° below horizontal, each side", g: "9.8 m/s²" },
    diagramSvg: CABLES_SVG,
    boardHint: "draw the forces on the light as arrows",
    reference: {
      fbd: [
        "Exactly three forces act on the light + knot:",
        "1. Gravity mg, straight down.",
        "2. Tension T1 along the left cable, pointing up and to the left (away from the knot, toward the wall).",
        "3. Tension T2 along the right cable, pointing up and to the right.",
        "Tensions always pull along the cable, away from the object.",
      ].join("\n"),
      equations: [
        "The light is at rest, so the net force is zero.",
        "1. Horizontal: T1 cos 30° = T2 cos 30°, so T1 = T2 = T (symmetric).",
        "2. Vertical: T sin 30° + T sin 30° − mg = 0, so 2T(0.5) = 98 N.",
        "3. Solve: T = 98 N in each cable.",
        "Each tension equals the full weight because the cables are shallow (30°).",
      ].join("\n"),
      finalAnswer: "T = 98 N in each cable",
    },
  }),
  withDiagram({
    id: "force-elevator",
    topic: "Newton's laws",
    title: "Standing on a scale in an elevator",
    text: "You (70 kg) stand on a bathroom scale in an elevator that is accelerating upward at 2.0 m/s². Draw your free-body diagram, then find what the scale reads (in newtons).",
    givenValues: { m: "70 kg", a: "2.0 m/s² up", g: "9.8 m/s²" },
    diagramSvg: ELEVATOR_SVG,
    boardHint: "draw the forces on you as arrows",
    reference: {
      fbd: [
        "Exactly two forces act on you:",
        "1. Gravity mg, straight down.",
        "2. Normal force N from the scale, straight up. (The scale reading is N.)",
        "Acceleration is not a force: no 'ma' arrow.",
      ].join("\n"),
      equations: [
        "Up is positive.",
        "1. Newton's second law: N − mg = ma.",
        "2. Solve: N = m(g + a) = 70 × (9.8 + 2.0) = 70 × 11.8 = 826 N.",
        "The scale reads more than your weight (686 N) because the elevator accelerates upward.",
      ].join("\n"),
      finalAnswer: "N = 826 N (about 830 N)",
    },
  }),
  withDiagram({
    id: "force-atwood",
    topic: "Connected objects",
    title: "Atwood machine",
    text: "Blocks of mass m1 = 3.0 kg and m2 = 5.0 kg hang from a light string over a frictionless, massless pulley. Draw the free-body diagram of each block, then find the acceleration of the blocks and the tension in the string.",
    givenValues: { m1: "3.0 kg", m2: "5.0 kg", g: "9.8 m/s²" },
    diagramSvg: ATWOOD_SVG,
    boardHint: "draw the forces on both blocks",
    reference: {
      fbd: [
        "Two forces act on each block:",
        "Block m1: tension T straight up, gravity m1 g straight down.",
        "Block m2: tension T straight up, gravity m2 g straight down.",
        "The tension is the same on both sides (light string, frictionless pulley).",
      ].join("\n"),
      equations: [
        "m2 is heavier, so m2 accelerates down and m1 accelerates up, both with magnitude a.",
        "1. Block m1 (up positive): T − m1 g = m1 a.",
        "2. Block m2 (down positive): m2 g − T = m2 a.",
        "3. Add: (m2 − m1) g = (m1 + m2) a, so a = 2.0 × 9.8 / 8.0 = 2.45 m/s².",
        "4. Tension: T = m1(g + a) = 3.0 × 12.25 ≈ 36.8 N.",
      ].join("\n"),
      finalAnswer: "a = 2.45 m/s² (m2 down, m1 up), T ≈ 36.8 N",
    },
  }),
];

export const ENERGY_MOMENTUM: Problem[] = [
  solveOnly({
    id: "en-slide",
    topic: "Energy",
    title: "Down a frictionless slide",
    text: "A child starts from rest at the top of a frictionless slide 5.0 m above the ground. How fast is the child moving at the bottom?",
    givenValues: { h: "5.0 m", v0: "0", g: "9.8 m/s²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Only gravity does work (the normal force is perpendicular to the motion), so mechanical energy is conserved.",
        "1. mgh = ½ m v².",
        "2. Mass cancels: v = √(2gh) = √(2 × 9.8 × 5.0) = √98 ≈ 9.9 m/s.",
        "The shape of the slide does not matter.",
      ].join("\n"),
      finalAnswer: "v ≈ 9.9 m/s",
    },
  }),
  solveOnly({
    id: "en-spring",
    topic: "Energy",
    title: "Launched by a spring",
    text: "A 0.50 kg block on a frictionless table is pushed against a spring (k = 200 N/m), compressing it 0.10 m, and then released. How fast is the block moving when it leaves the spring?",
    givenValues: { m: "0.50 kg", k: "200 N/m", x: "0.10 m" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Spring potential energy becomes kinetic energy.",
        "1. ½ k x² = ½ m v².",
        "2. ½ × 200 × 0.10² = 1.0 J.",
        "3. v = x √(k / m) = 0.10 × √400 = 2.0 m/s.",
      ].join("\n"),
      finalAnswer: "v = 2.0 m/s",
    },
  }),
  solveOnly({
    id: "en-friction-stop",
    topic: "Work and energy",
    title: "Sliding to a stop",
    text: "A 2.0 kg box slides across a floor at 6.0 m/s. The coefficient of kinetic friction is μk = 0.30. Use the work-energy theorem to find how far the box slides before it stops.",
    givenValues: { m: "2.0 kg", v0: "6.0 m/s", μk: "0.30", g: "9.8 m/s²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "1. Friction: fk = μk N = μk mg = 0.30 × 2.0 × 9.8 = 5.88 N.",
        "2. Work-energy: W_friction = ΔK, so −fk d = 0 − ½ m v0².",
        "3. ½ × 2.0 × 6.0² = 36 J, so d = 36 / 5.88 ≈ 6.1 m.",
        "Equivalent: d = v0² / (2 μk g).",
      ].join("\n"),
      finalAnswer: "d ≈ 6.1 m",
    },
  }),
  solveOnly({
    id: "mom-collision",
    topic: "Momentum",
    title: "Cars that stick together",
    text: "A 1200 kg car moving at 15 m/s rear-ends an 800 kg car at rest. The cars lock together. Find their speed just after the collision and the kinetic energy lost.",
    givenValues: { m1: "1200 kg", v1: "15 m/s", m2: "800 kg", v2: "0" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Momentum is conserved in the collision (perfectly inelastic). Kinetic energy is not.",
        "1. m1 v1 = (m1 + m2) v, so v = 1200 × 15 / 2000 = 9.0 m/s.",
        "2. K before = ½ × 1200 × 15² = 135 000 J.",
        "3. K after = ½ × 2000 × 9.0² = 81 000 J.",
        "4. Lost: 135 000 − 81 000 = 54 000 J.",
      ].join("\n"),
      finalAnswer: "v = 9.0 m/s, ΔK = 54 000 J lost (5.4 × 10⁴ J)",
    },
  }),
  solveOnly({
    id: "mom-impulse",
    topic: "Impulse",
    title: "Hitting a baseball",
    text: "A 0.15 kg baseball arrives at 40 m/s and leaves the bat at 50 m/s in the opposite direction. The bat is in contact with the ball for 1.5 ms. Find the average force of the bat on the ball.",
    givenValues: { m: "0.15 kg", vi: "40 m/s", vf: "50 m/s (reversed)", Δt: "1.5 ms" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Take the ball's final direction as positive, so vi = −40 m/s and vf = +50 m/s.",
        "1. Impulse: J = Δp = m(vf − vi) = 0.15 × (50 − (−40)) = 0.15 × 90 = 13.5 N·s.",
        "2. Average force: F = J / Δt = 13.5 / 0.0015 = 9000 N.",
        "Forgetting the direction change (using 50 − 40) gives a force ten times too small.",
      ].join("\n"),
      finalAnswer: "F = 9000 N (9.0 × 10³ N) in the direction the ball leaves",
    },
  }),
];

export const ROTATION: Problem[] = [
  withDiagram({
    id: "circ-flat-curve",
    topic: "Circular motion",
    title: "Car on a flat curve",
    text: "A car rounds a flat (unbanked) curve of radius 50 m. The coefficient of static friction between the tires and the road is μs = 0.80. Draw the free-body diagram of the car as seen from behind, then find the maximum speed at which it can take the curve without skidding.",
    givenValues: { r: "50 m", μs: "0.80", g: "9.8 m/s²" },
    diagramSvg: CURVE_SVG,
    boardHint: "draw the forces on the car as arrows",
    reference: {
      fbd: [
        "Exactly three forces act on the car:",
        "1. Gravity mg, straight down.",
        "2. Normal force N, straight up from the road.",
        "3. Static friction fs, horizontal, pointing toward the center of the curve (to the left in the drawing).",
        "There is no outward 'centrifugal' force and no separate 'centripetal force' arrow: friction is the centripetal force.",
      ].join("\n"),
      equations: [
        "1. Vertical: N = mg.",
        "2. Toward the center: fs = m v² / r.",
        "3. At the maximum speed, fs = μs N = μs mg.",
        "4. So μs mg = m v² / r, giving v = √(μs g r) = √(0.80 × 9.8 × 50) = √392 ≈ 19.8 m/s.",
        "Mass cancels.",
      ].join("\n"),
      finalAnswer: "v_max ≈ 19.8 m/s (about 20 m/s)",
    },
  }),
  solveOnly({
    id: "grav-orbit",
    topic: "Gravity",
    title: "Satellite in a circular orbit",
    text: "A satellite moves in a circular orbit of radius 7.0 × 10⁶ m measured from Earth's center. Using GM_E = 3.99 × 10¹⁴ m³/s², find the satellite's orbital speed and its period.",
    givenValues: { r: "7.0 × 10⁶ m", GM_E: "3.99 × 10¹⁴ m³/s²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "Gravity provides the centripetal force.",
        "1. G M m / r² = m v² / r, so v = √(GM / r).",
        "2. v = √(3.99 × 10¹⁴ / 7.0 × 10⁶) = √(5.70 × 10⁷) ≈ 7.55 × 10³ m/s.",
        "3. Period: T = 2πr / v = 2π × 7.0 × 10⁶ / 7550 ≈ 5.8 × 10³ s (about 97 minutes).",
      ].join("\n"),
      finalAnswer: "v ≈ 7.55 × 10³ m/s, T ≈ 5.8 × 10³ s",
    },
  }),
  solveOnly({
    id: "rot-disk-torque",
    topic: "Rotational dynamics",
    title: "Pulling string off a disk",
    text: "A uniform solid disk (M = 2.0 kg, R = 0.10 m) can spin freely about its center. A string wrapped around its rim is pulled with a constant force of 4.0 N. Find the disk's angular acceleration.",
    givenValues: { M: "2.0 kg", R: "0.10 m", F: "4.0 N", I: "½ M R²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "1. Moment of inertia: I = ½ M R² = ½ × 2.0 × 0.10² = 0.010 kg·m².",
        "2. Torque from the string (tangent to the rim): τ = F R = 4.0 × 0.10 = 0.40 N·m.",
        "3. τ = I α, so α = 0.40 / 0.010 = 40 rad/s².",
      ].join("\n"),
      finalAnswer: "α = 40 rad/s²",
    },
  }),
  solveOnly({
    id: "rot-skater",
    topic: "Angular momentum",
    title: "Spinning skater pulls in her arms",
    text: "A figure skater spins at 2.0 rev/s with her arms out, where her moment of inertia is 4.0 kg·m². She pulls her arms in, reducing her moment of inertia to 1.6 kg·m². Ignoring friction, find her new spin rate.",
    givenValues: { ω0: "2.0 rev/s", I0: "4.0 kg·m²", I: "1.6 kg·m²" },
    reference: {
      fbd: noDiagram,
      equations: [
        "No external torque about the spin axis, so angular momentum is conserved.",
        "1. I0 ω0 = I ω.",
        "2. ω = I0 ω0 / I = 4.0 × 2.0 / 1.6 = 5.0 rev/s.",
        "Units of rev/s carry through; no need to convert to rad/s.",
      ].join("\n"),
      finalAnswer: "ω = 5.0 rev/s",
    },
  }),
  solveOnly({
    id: "rot-seesaw",
    topic: "Static equilibrium",
    title: "Balancing a seesaw",
    text: "A 30 kg child sits 2.0 m from the pivot of a uniform seesaw. Where must a 40 kg child sit on the other side so the seesaw balances?",
    givenValues: { m1: "30 kg", d1: "2.0 m", m2: "40 kg" },
    reference: {
      fbd: noDiagram,
      equations: [
        "The seesaw is uniform and pivoted at its center, so its own weight exerts no torque.",
        "1. Balance torques about the pivot: m1 g d1 = m2 g d2.",
        "2. d2 = m1 d1 / m2 = 30 × 2.0 / 40 = 1.5 m.",
      ].join("\n"),
      finalAnswer: "d = 1.5 m from the pivot",
    },
  }),
];

export type Homework = {
  id: string;
  title: string;
  course: string;
  due: string | null; // null once turned in
  dueDate?: string | null; // YYYY-MM-DD, uploaded worksheets only
  problems: Problem[];
  createdAt?: string; // uploaded worksheets only
};

export const RAMPS = PROBLEMS;

export const HOMEWORK: Homework[] = [
  { id: "hw4", title: "HW 4 · Ramps", course: "Physics 121", due: "due Friday", problems: RAMPS },
  { id: "hw5", title: "HW 5 · Energy & momentum", course: "Physics 121", due: "due next Wed", problems: ENERGY_MOMENTUM },
  { id: "hw6", title: "HW 6 · Circles, gravity & rotation", course: "Physics 121", due: "due next Fri", problems: ROTATION },
  { id: "hw3", title: "HW 3 · Newton's laws", course: "Physics 121", due: "due Monday", problems: FORCES },
  { id: "hw2", title: "HW 2 · Kinematics", course: "Physics 121", due: "practice", problems: KINEMATICS },
];

const ALL_PROBLEMS = HOMEWORK.flatMap((hw) => hw.problems);

export function getProblem(id: string): Problem | undefined {
  if (id === "board") return {
    id: "board", title: "Scratch work", type: "general", givenValues: {},
    text: "Review only the physics and mathematics visible on this scratch board. No assigned problem or reference answer is available. Do not assume a ramp or invent missing givens. If there is insufficient context to judge, report unreadable rather than guessing.",
    reference: { fbd: "Judge only forces whose physical context is visible.", equations: "Check only the written mathematical transitions and visible physical assumptions.", finalAnswer: "No reference answer. Do not invent a problem or a final answer." },
  };
  return ALL_PROBLEMS.find((p) => p.id === id);
}

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
