import { parse } from "mathjs/number";

export type AngleMode = "deg" | "rad";

/** A scalar scientific calculator using Math.js's expression parser, entirely offline. */
export function calculate(expression: string, mode: AngleMode, answer = 0): number {
  if (!expression.trim()) throw new Error("Enter an expression first.");
  if (expression.length > 250) throw new Error("Try a shorter expression.");
  const radians = (x: number) => mode === "deg" ? x * Math.PI / 180 : x;
  const degrees = (x: number) => mode === "deg" ? x * 180 / Math.PI : x;
  const scope = new Map<string, number | ((x: number) => number)>([
    ["pi", Math.PI], ["e", Math.E], ["Ans", answer],
    ["sin", (x) => Math.sin(radians(x))],
    ["cos", (x) => Math.cos(radians(x))],
    ["tan", (x) => {
      if (Math.abs(Math.cos(radians(x))) < 1e-14) throw new Error("Tangent is undefined at this angle.");
      return Math.tan(radians(x));
    }],
    ["asin", (x) => degrees(Math.asin(x))],
    ["acos", (x) => degrees(Math.acos(x))],
    ["atan", (x) => degrees(Math.atan(x))],
    ["sqrt", Math.sqrt], ["ln", Math.log], ["log", Math.log10],
    ["abs", Math.abs], ["exp", Math.exp],
  ]);
  const normalized = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-")
    .replace(/π/g, "pi").replace(/√/g, "sqrt").replace(/²/g, "^2").replace(/³/g, "^3");
  let node;
  try {
    node = parse(normalized);
  } catch {
    throw new Error("Check the expression and parentheses.");
  }
  // Only scalar arithmetic and the functions on our keypad; no assignments, arrays,
  // ranges, property access, or arbitrary Math.js functions that could block the UI.
  node.traverse((child) => {
    if (child.type === "OperatorNode") {
      if (!/^(add|subtract|multiply|divide|pow|unaryMinus|unaryPlus)$/.test((child as import("mathjs").OperatorNode).fn)) {
        throw new Error("Use +, −, ×, ÷ or ^ for arithmetic.");
      }
    } else if (child.type === "SymbolNode") {
      if (!scope.has((child as import("mathjs").SymbolNode).name)) throw new Error("Use the scientific functions or Ans.");
    } else if (child.type === "FunctionNode") {
      const fn = child as import("mathjs").FunctionNode;
      if (fn.fn.type !== "SymbolNode" || typeof scope.get(fn.fn.name) !== "function" || fn.args.length !== 1) throw new Error("Functions need one value in parentheses.");
    } else if (child.type === "ConstantNode") {
      if (typeof (child as import("mathjs").ConstantNode).value !== "number") throw new Error("Enter numbers and mathematical expressions.");
    } else if (child.type !== "ParenthesisNode") {
      throw new Error("Use a single numerical expression.");
    }
  });
  const result: unknown = node.compile().evaluate(scope);
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("No finite real result. Check the values and division by zero.");
  }
  return result;
}

export const formatAnswer = (value: number) => Number(value.toPrecision(12)).toString();
