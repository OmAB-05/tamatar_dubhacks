"""Deterministic freehand-tolerance fixtures; no external handwriting datasets needed.

python3 -I scripts/eval/generate_fbd_cases.py
python3 -I scripts/eval/run_eval.py --model sonnet --yes-spend \
    --labels datasets/eval/fbd-tolerance/labels --images datasets/eval/fbd-tolerance

These synthetic sketches are regression checks, not a substitute for real iPad ink.
"""

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "datasets/eval/fbd-tolerance"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "labels").mkdir(exist_ok=True)
FONT = ImageFont.truetype(str(ROOT / "public/fonts/Myfont.ttf"), 34)

# A 30-degree ramp slopes down to the right, matching the app's drawing.
ORIGIN = (500, 280)


def arrow(draw, degrees, label, wobble=0, color="#1f1a17", width=5):
    angle = math.radians(degrees)
    dx, dy = math.cos(angle), math.sin(angle)
    points = []
    for i in range(25):
        t = i / 24
        offset = wobble * math.sin(t * math.pi * 6) * math.sin(t * math.pi)
        points.append((ORIGIN[0] + 180 * t * dx - offset * dy,
                       ORIGIN[1] + 180 * t * dy + offset * dx))
    draw.line(points, fill=color, width=width)
    x, y = points[-1]
    draw.line([(x - 24 * dx - 12 * dy, y - 24 * dy + 12 * dx), (x, y),
               (x - 20 * dx + 10 * dy, y - 20 * dy - 10 * dx)], fill=color, width=width)
    draw.text((x + 12, y - 10), label, font=FONT, fill=color)


CASES = [
    ("clean-correct", -60, 90, 0, True, None, True),
    ("wobbly-correct", -60, 90, 9, True, None, True),
    ("approximate-normal-correct", -47, 90, 5, True, None, True),
    ("tilted-gravity-coloured-correct", -65, 83, 7, True, None, True),
    ("normal-along-ramp-wrong", 30, 90, 4, False, "normal_force_direction", True),
    ("normal-into-ramp-wrong", 120, 90, 4, False, "normal_force_direction", True),
    ("gravity-upward-wrong", -60, -90, 4, False, "gravity_direction", True),
    ("missing-normal-finished-wrong", None, 90, 4, False, "missing_normal_force", True),
    ("missing-normal-check-wrong", None, 90, 4, False, "missing_normal_force", False),
]

for i, (name, normal, gravity, wobble, correct, error, final) in enumerate(CASES, 1):
    image = Image.new("RGB", (1000, 640), "white")
    draw = ImageDraw.Draw(image)
    draw.line([(180, 146), (830, 521), (180, 521), (180, 146)], fill="#6b6461", width=4)
    # The block's lower edge rests on the slope at its midpoint.
    a = math.pi / 6
    corners = [(ORIGIN[0] + x * math.cos(a) - y * math.sin(a),
                ORIGIN[1] + x * math.sin(a) + y * math.cos(a))
               for x, y in [(-60, -40), (60, -40), (60, 40), (-60, 40)]]
    draw.polygon(corners, fill="#fdecea", outline="#6b6461", width=3)
    draw.text((725, 474), "30°", font=FONT, fill="#6b6461")
    colored = "coloured" in name
    if normal is not None:
        arrow(draw, normal, "N", wobble, "#2456a6" if colored else "#1f1a17", 3 if colored else 5)
    arrow(draw, gravity, "mg", wobble, "#7645a0" if colored else "#1f1a17")
    case_id = f"case-{i:03d}-{name}"
    path = OUT / f"{case_id}.png"
    image.save(path)
    label = {
        "id": case_id, "image": path.name,
        "imageSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "problemId": "ramp-frictionless", "part": "fbd", "isFinal": final,
        "mutation": name, "correct": correct, "errorKey": error,
        "acceptErrorKeys": [error] if error else [],
        # Classification fixtures; no hand-annotated localization ground truth.
        "bbox": None, "tokenBbox": None,
    }
    (OUT / "labels" / f"{case_id}.json").write_text(json.dumps(label, indent=2) + "\n")

print(f"Wrote {len(CASES)} FBD fixtures to {OUT}")
