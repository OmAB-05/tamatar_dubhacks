import type { Homework } from "@/data/problems";
import { figureUrl } from "./cloud";
import { exportPng } from "./ink";
import { partsOf, type PartProgress } from "./progress";
import { rampSvg } from "./ramp";
import type { Answer } from "./store";
import type { Figure, Problem } from "./types";

// Homework → PDF: each problem starts a page with its statement and figures, followed by the
// student's diagram and solution boards, ready to upload to Canvas.

/** What's printed on a problem's diagram board: the ramp, its own setup drawing, or nothing. */
export function underlayFor(p: Problem): string {
  if (p.type === "inclined_plane") return rampSvg(parseInt(p.givenValues["θ"] ?? "30") || 30);
  return p.diagramSvg ?? "";
}

async function loadFont(): Promise<string | null> {
  try {
    const buf = await (await fetch("/fonts/Myfont.ttf")).arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  } catch {
    return null;
  }
}

type LoadedFigure = { data: string; format: "JPEG" | "PNG"; w: number; h: number };

async function loadFigure(f: Figure): Promise<LoadedFigure | null> {
  try {
    const blob = await (await fetch(await figureUrl(f.src))).blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    const img = new Image();
    img.src = data;
    await img.decode();
    return { data, format: blob.type === "image/png" ? "PNG" : "JPEG", w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null; // a missing figure shouldn't stop the export
  }
}

export async function exportHomeworkPdf(hw: Homework, answers: Record<string, Answer>, name: string, progress: Record<string, PartProgress> = {}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const font = await loadFont();
  if (font) {
    doc.addFileToVFS("Myfont.ttf", font);
    doc.addFont("Myfont.ttf", "Myfont", "normal");
    doc.setFont("Myfont");
  }

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const imgW = W - 2 * M;
  const imgH = ((imgW * 640) / 1000) * 0.75; // boards are 1000×640; shrink so two fit per page
  const boxW = (imgH * 1000) / 640;
  const FIGURE_MAX_H = 170;

  let pageNo = 0;
  const header = () => {
    pageNo++;
    doc.setFontSize(11);
    doc.setTextColor(107, 100, 97);
    doc.text(`${hw.title}  ·  ${name || "student"}`, M, M);
    doc.text(`page ${pageNo}`, W - M, M, { align: "right" });
    return M + 30;
  };

  for (let i = 0; i < hw.problems.length; i++) {
    const p = hw.problems[i];
    const a = answers[p.id] ?? { fbd: [], equations: [] };
    if (i > 0) doc.addPage();
    let y = header();
    const room = (h: number) => {
      if (y + h <= H - M) return;
      doc.addPage();
      y = header();
    };

    doc.setFontSize(20);
    doc.setTextColor(194, 57, 45);
    doc.text(`Problem ${i + 1}`, M, y);
    if (p.topic) {
      doc.setFontSize(11);
      doc.setTextColor(107, 100, 97);
      doc.text(p.topic, W - M, y, { align: "right" });
    }
    y += 20;
    doc.setFontSize(12);
    doc.setTextColor(31, 26, 23);
    const lines = doc.splitTextToSize(p.text, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 15 + 10;

    // figures, side by side, scaled to a common height
    const figures = (await Promise.all((p.figures ?? []).map(loadFigure))).filter((f): f is LoadedFigure => !!f);
    if (figures.length) {
      const gap = 12;
      let h = FIGURE_MAX_H;
      const widthAt = (hh: number) => figures.reduce((sum, f) => sum + (f.w / f.h) * hh, 0) + gap * (figures.length - 1);
      if (widthAt(h) > imgW) h = (h * (imgW - gap * (figures.length - 1))) / (widthAt(h) - gap * (figures.length - 1));
      room(h + 10);
      let x = M + (imgW - widthAt(h)) / 2;
      for (const f of figures) {
        const w = (f.w / f.h) * h;
        doc.addImage(f.data, f.format, x, y, w, h);
        x += w + gap;
      }
      y += h + 16;
    }

    for (const part of partsOf(p)) {
      const label = part === "fbd" ? "free-body diagram" : partsOf(p).length > 1 ? "equations" : "solution";
      room(imgH + 30);
      doc.setFontSize(13);
      doc.setTextColor(74, 67, 64);
      doc.text(label, M, y);
      if (progress[p.id]?.[part]) {
        doc.setTextColor(40, 116, 71);
        doc.text("checked", W - M, y, { align: "right" });
      }
      y += 8;
      const jpg = await exportPng(part === "fbd" ? a.fbd : a.equations, 0.9, part === "fbd" ? underlayFor(p) : "", "image/jpeg");
      doc.addImage(`data:image/jpeg;base64,${jpg}`, "JPEG", M + (imgW - boxW) / 2, y, boxW, imgH);
      doc.setDrawColor(235, 207, 203);
      doc.rect(M + (imgW - boxW) / 2, y, boxW, imgH);
      y += imgH + 22;
    }
  }

  doc.save(`${hw.title.replace(/[^\w\- ]+/g, "").replace(/\s+/g, " ").trim() || "homework"}.pdf`);
}
