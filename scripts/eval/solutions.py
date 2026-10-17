"""Line-by-line Part B solutions for the five demo problems, plus one-line mutations.

Transcribed from `reference.equations` in data/problems.ts (g = 9.8 m/s²,
sin 30° = 0.5, cos 30° ≈ 0.866). The generator checks that every problem id
still exists there.

Line markup (rendered by generate_cases.py):
    _x   subscript x      (f_k, μ_s)
    ^x   superscript x    (m/s^2)
    −    minus (U+2212), × times, ≈ approx, θ, μ, °

A mutation replaces lines from `line` (1-based) onward: the first replaced
line is the first error, and later lines carry its consequences forward the
way a student would, so the first-error line is unambiguous.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Mutation:
    key: str  # short id used in case names
    error_key: str  # one of ERROR_KEYS in lib/parse.ts
    line: int  # 1-based first-error line
    replacement: tuple[str, ...]  # new lines from `line` onward
    # Other ERROR_KEYS a fair grader could pick for the same mistake.
    also_accept: tuple[str, ...] = ()
    token: str | None = None  # substring of the first replaced line that is wrong, for a tight box


@dataclass(frozen=True)
class Solution:
    problem_id: str
    lines: tuple[str, ...]
    mutations: tuple[Mutation, ...]


SOLUTIONS: tuple[Solution, ...] = (
    Solution(
        "ramp-frictionless",
        (
            "N − mg cos θ = 0",
            "N = mg cos θ = 42.4 N",
            "mg sin θ = ma",
            "a = g sin θ",
            "a = 9.8 × 0.5 = 4.9 m/s^2",
        ),
        (
            Mutation(
                "sin_cos_swap", "sin_cos_swap", 3,
                ("mg cos θ = ma", "a = g cos θ", "a = 9.8 × 0.866 = 8.5 m/s^2"),
                token="cos",
            ),
            Mutation("normal_force_equals_mg", "normal_force_equals_mg", 2, ("N = mg = 49 N",), token="mg = 49"),
            Mutation("sign_error", "sign_error", 1, ("N + mg cos θ = 0", "N = −mg cos θ = −42.4 N"), token="+"),
            Mutation(
                "algebra_error", "algebra_error", 4, ("a = g / sin θ", "a = 9.8 / 0.5 = 19.6 m/s^2"),
                token="/ sin θ",
            ),
            Mutation("arithmetic_error", "arithmetic_error", 5, ("a = 9.8 × 0.5 = 5.9 m/s^2",), token="5.9"),
            Mutation(
                "unit_error", "unit_error", 5, ("a = 9.8 × 0.5 = 4.9 N",),
                also_accept=("final_answer_wrong",), token="4.9 N",
            ),
        ),
    ),
    Solution(
        "ramp-kinetic-friction",
        (
            "N = mg cos θ = 42.4 N",
            "f_k = μ_k N = 0.2 × 42.4 = 8.49 N",
            "mg sin θ − f_k = ma",
            "24.5 − 8.49 = 5a",
            "a = 16.0 / 5 ≈ 3.2 m/s^2",
        ),
        (
            Mutation(
                "sign_error", "sign_error", 3,
                ("mg sin θ + f_k = ma", "24.5 + 8.49 = 5a", "a = 33.0 / 5 ≈ 6.6 m/s^2"),
                token="+",
            ),
            Mutation(
                "normal_force_equals_mg", "normal_force_equals_mg", 1,
                (
                    "N = mg = 49 N",
                    "f_k = μ_k N = 0.2 × 49 = 9.8 N",
                    "mg sin θ − f_k = ma",
                    "24.5 − 9.8 = 5a",
                    "a = 14.7 / 5 ≈ 2.9 m/s^2",
                ),
                also_accept=("friction_formula",), token="mg = 49",
            ),
            Mutation(
                "friction_formula", "friction_formula", 2,
                (
                    "f_k = μ_k mg = 0.2 × 49 = 9.8 N",
                    "mg sin θ − f_k = ma",
                    "24.5 − 9.8 = 5a",
                    "a = 14.7 / 5 ≈ 2.9 m/s^2",
                ),
                also_accept=("normal_force_equals_mg",), token="μ_k mg",
            ),
            Mutation(
                "sin_cos_swap", "sin_cos_swap", 1,
                (
                    "N = mg sin θ = 24.5 N",
                    "f_k = μ_k N = 0.2 × 24.5 = 4.9 N",
                    "mg sin θ − f_k = ma",
                    "24.5 − 4.9 = 5a",
                    "a = 19.6 / 5 ≈ 3.9 m/s^2",
                ),
                token="sin",
            ),
            Mutation("arithmetic_error", "arithmetic_error", 5, ("a = 16.0 / 5 ≈ 3.8 m/s^2",), token="3.8"),
        ),
    ),
    Solution(
        "ramp-min-static-friction",
        (
            "N = mg cos θ = 42.4 N",
            "f_s = mg sin θ = 24.5 N",
            "f_s = μ_s N",
            "μ_s mg cos θ = mg sin θ",
            "μ_s = tan θ = tan 30° ≈ 0.58",
        ),
        (
            Mutation(
                "sin_cos_swap", "sin_cos_swap", 2,
                ("f_s = mg cos θ = 42.4 N", "f_s = μ_s N", "μ_s mg cos θ = mg cos θ", "μ_s = 1"),
                token="cos",
            ),
            Mutation("algebra_error", "algebra_error", 5, ("μ_s = cos θ / sin θ ≈ 1.73",), token="cos θ / sin θ"),
            Mutation("arithmetic_error", "arithmetic_error", 5, ("μ_s = tan θ = tan 30° ≈ 0.87",), token="0.87"),
            Mutation(
                "normal_force_equals_mg", "normal_force_equals_mg", 1,
                ("N = mg = 49 N", "f_s = mg sin θ = 24.5 N", "f_s = μ_s N", "μ_s mg = mg sin θ", "μ_s = sin θ = 0.5"),
                token="mg = 49",
            ),
            Mutation(
                "friction_formula", "friction_formula", 3,
                ("f_s = μ_s mg", "μ_s mg = mg sin θ", "μ_s = sin 30° = 0.5"),
                also_accept=("normal_force_equals_mg",), token="μ_s mg",
            ),
        ),
    ),
    Solution(
        "ramp-horizontal-push",
        (
            "F cos θ = 50 × 0.866 = 43.3 N",
            "mg sin θ = 24.5 N",
            "N = mg cos θ + F sin θ = 67.4 N",
            "F cos θ − mg sin θ = ma",
            "43.3 − 24.5 = 5a",
            "a = 18.8 / 5 ≈ 3.76 m/s^2",
        ),
        (
            Mutation(
                "sin_cos_swap", "sin_cos_swap", 1,
                (
                    "F sin θ = 50 × 0.5 = 25 N",
                    "mg sin θ = 24.5 N",
                    "N = mg cos θ + F sin θ = 67.4 N",
                    "F sin θ − mg sin θ = ma",
                    "25 − 24.5 = 5a",
                    "a = 0.5 / 5 = 0.1 m/s^2",
                ),
                token="sin",
            ),
            Mutation("normal_force_equals_mg", "normal_force_equals_mg", 3, ("N = mg = 49 N",), token="mg = 49"),
            Mutation(
                "sign_error", "sign_error", 4,
                ("F cos θ + mg sin θ = ma", "43.3 + 24.5 = 5a", "a = 67.8 / 5 ≈ 13.6 m/s^2"),
                token="+",
            ),
            Mutation("arithmetic_error", "arithmetic_error", 6, ("a = 18.8 / 5 ≈ 9.4 m/s^2",), token="9.4"),
            Mutation(
                "missing_force_in_sum", "missing_force_in_sum", 4,
                ("F cos θ = ma", "43.3 = 5a", "a = 43.3 / 5 ≈ 8.66 m/s^2"),
                also_accept=("newton_second_law_setup",), token="F cos θ = ma",
            ),
        ),
    ),
    Solution(
        "ramp-normal-force",
        (
            "N − mg cos θ = 0",
            "N = mg cos θ",
            "N = 10 × 9.8 × 0.866",
            "N ≈ 84.9 N",
        ),
        (
            Mutation(
                "normal_force_equals_mg", "normal_force_equals_mg", 2, ("N = mg", "N = 10 × 9.8", "N = 98 N"),
                token="mg",
            ),
            Mutation(
                "sin_cos_swap", "sin_cos_swap", 1,
                ("N − mg sin θ = 0", "N = mg sin θ", "N = 10 × 9.8 × 0.5", "N = 49 N"),
                token="sin",
            ),
            Mutation(
                "sign_error", "sign_error", 1,
                ("N + mg cos θ = 0", "N = −mg cos θ", "N = −10 × 9.8 × 0.866", "N ≈ −84.9 N"),
                token="+",
            ),
            Mutation("arithmetic_error", "arithmetic_error", 4, ("N ≈ 74.9 N",), token="74.9"),
            Mutation(
                "unit_error", "unit_error", 4, ("N ≈ 84.9 kg",), also_accept=("final_answer_wrong",), token="kg",
            ),
        ),
    ),
)


def mutated_lines(sol: Solution, m: Mutation) -> list[str]:
    head = list(sol.lines[: m.line - 1])
    tail_start = m.line - 1 + len(m.replacement)
    # Replacement covers the rest of the solution unless it is shorter than what is left,
    # in which case unchanged original lines follow (e.g. N = mg, then the unaffected along-ramp steps).
    return head + list(m.replacement) + list(sol.lines[tail_start:])
