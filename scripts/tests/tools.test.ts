import assert from "node:assert/strict";
import { test } from "node:test";
import { calculate, formatAnswer } from "../../lib/calculator";
import { distToStroke, rulerEnd, savedStrokePath, strokeColor, strokeOpacity, strokePath } from "../../lib/ink";
import type { Stroke } from "../../lib/types";

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≈ ${expected}`);

test("scientific arithmetic respects precedence, powers, roots and implicit multiplication", () => {
  assert.equal(calculate("2 + 3 * 4", "deg"), 14);
  assert.equal(calculate("(2 + 3) * 4", "deg"), 20);
  assert.equal(calculate("sqrt(3^2 + 4^2)", "deg"), 5);
  assert.equal(calculate("2(3 + 4)", "deg"), 14);
  assert.equal(formatAnswer(calculate("6.02 * 10^23", "deg")), "6.02e+23");
});

test("degree and radian modes apply to forward and inverse trig", () => {
  close(calculate("sin(30)", "deg"), 0.5);
  close(calculate("cos(60)", "deg"), 0.5);
  close(calculate("tan(45)", "deg"), 1);
  close(calculate("sin(pi/2)", "rad"), 1);
  close(calculate("asin(0.5)", "deg"), 30);
  close(calculate("acos(0.5)", "deg"), 60);
  close(calculate("atan(1)", "rad"), Math.PI / 4);
});

test("log is base ten, ln is natural, and Ans retains numeric precision", () => {
  close(calculate("ln(e) + log(100)", "deg"), 3);
  assert.equal(calculate("Ans * 3", "deg", 1 / 3), 1);
  assert.equal(formatAnswer(calculate("0.1 + 0.2", "deg")), "0.3");
  assert.equal(calculate("5 × 9.8 × cos(30)", "deg"), 5 * 9.8 * Math.cos(Math.PI / 6));
  assert.equal(calculate("√(9) + 2² − 1", "deg"), 6);
});

test("invalid or non-real expressions return errors without executing broader Math.js operations", () => {
  for (const expression of ["", "sin(", "1/0", "sqrt(-1)", "log(0)", "asin(2)", "tan(90)", "1e999", "a=4", "[1,2]", "1:10000000", "ones(100000000)", 'import("x")', "sqrt(4, 5)", "9!", "Ans.constructor", "2".repeat(251)]) {
    assert.throws(() => calculate(expression, "deg"), /./, expression);
  }
});

const oldStroke: Stroke = { id: "legacy", tool: "pen", points: [[10, 10, 0.5], [300, 10, 0.5]] };

test("legacy ink keeps its original rendering and default colour", () => {
  assert.equal(savedStrokePath(oldStroke), strokePath(oldStroke.points));
  assert.equal(strokeColor(oldStroke), "#1f1a17");
  assert.equal(strokeOpacity(oldStroke), 1);
});

test("pencil, colour and width survive serialization and alter rendering", () => {
  const pencil: Stroke = { ...oldStroke, tool: "pencil", color: "#2456a6", size: 11, simulatePressure: true };
  const restored: Stroke = JSON.parse(JSON.stringify(pencil));
  assert.equal(savedStrokePath(restored), savedStrokePath(pencil));
  assert.notEqual(savedStrokePath(restored), savedStrokePath(oldStroke));
  assert.equal(strokeColor(restored), "#2456a6");
  assert.equal(strokeOpacity(restored), 0.72);
  assert.notEqual(savedStrokePath({ ...oldStroke, size: 3 }), savedStrokePath({ ...oldStroke, size: 11 }));
  assert.equal(strokeColor({ color: '\"/><script>bad</script>' }), "#1f1a17");
});

test("eraser hits the middle of a ruler line, including sparse and zero-length strokes", () => {
  assert.equal(distToStroke({ ...oldStroke, tool: "ruler" }, 150, 10), 0);
  assert.equal(distToStroke(oldStroke, 150, 20), 10);
  assert.equal(distToStroke(oldStroke, 310, 10), 10);
  assert.equal(distToStroke({ ...oldStroke, points: [[10, 10, 0.5]] }, 13, 14), 5);
});

test("ruler snapping preserves length and supports oblique and reverse directions", () => {
  assert.deepEqual(rulerEnd([0, 0, 0.5], [100, 20, 0.8], false), [100, 20, 0.5]);
  for (const end of [[100, 20, 0.5], [-100, -20, 0.5], [0, 0, 0.5]] as const) {
    const snapped = rulerEnd([0, 0, 0.5], [...end], true);
    close(Math.hypot(snapped[0], snapped[1]), Math.hypot(end[0], end[1]));
    const steps = Math.atan2(snapped[1], snapped[0]) / (Math.PI / 12);
    close(steps, Math.round(steps));
  }
});
