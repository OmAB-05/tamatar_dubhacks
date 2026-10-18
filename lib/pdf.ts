import type { Homework } from "@/data/problems";
import { exportPng } from "./ink";
import { rampSvg } from "./ramp";
import type { Answer } from "./store";

// Homework → one PDF page per problem (diagram + equations), ready to upload to Canvas.

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

export async function exportHomeworkPdf(hw: Homework, answers: Record<string, Answer>, name: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const font = await loadFont();
  if (font) {
    doc.addFileToVFS("Myfont.ttf", font);
    doc.addFont("Myfont.ttf", "Myfont", "normal");
    doc.setFont("Myfont");
  }

  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const imgW = W - 2 * M;
  const imgH = ((imgW * 640) / 1000) * 0.75; // boards are 1000×640; shrink so two fit per page
  const boxW = (imgH * 1000) / 640;

  for (let i = 0; i < hw.problems.length; i++) {
    const p = hw.problems[i];
    const a = answers[p.id] ?? { fbd: [], equations: [] };
    if (i > 0) doc.addPage();
    let y = M;

    doc.setFontSize(11);
    doc.setTextColor(107, 100, 97);
    doc.text(`${hw.title}  ·  ${name || "student"}`, M, y);
    doc.text(`page ${i + 1} of ${hw.problems.length}`, W - M, y, { align: "right" });
    y += 30;

    doc.setFontSize(20);
    doc.setTextColor(194, 57, 45);
    doc.text(`Problem ${i + 1}`, M, y);
    y += 20;
    doc.setFontSize(12);
    doc.setTextColor(31, 26, 23);
    const lines = doc.splitTextToSize(p.text, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 15 + 16;

    const angle = parseInt(p.givenValues["θ"] ?? "30") || 30;
    for (const [label, strokes, under] of [
      ["free-body diagram", a.fbd, rampSvg(angle)],
      ["equations", a.equations, ""],
    ] as const) {
      doc.setFontSize(13);
      doc.setTextColor(74, 67, 64);
      doc.text(label, M, y);
      y += 8;
      const jpg = await exportPng(strokes, 0.9, under, "image/jpeg");
      doc.addImage(`data:image/jpeg;base64,${jpg}`, "JPEG", M + (imgW - boxW) / 2, y, boxW, imgH);
      doc.setDrawColor(235, 207, 203);
      doc.rect(M + (imgW - boxW) / 2, y, boxW, imgH);
      y += imgH + 22;
    }
  }

  doc.save(`${hw.title.replace(/[^\w\- ]+/g, "").replace(/\s+/g, " ").trim() || "homework"}.pdf`);
}
