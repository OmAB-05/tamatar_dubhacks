"use client";

import type { Figure, FigureBox } from "./types";

// Crop each problem's figures out of the uploaded worksheet in the browser. The extractor
// says where each figure is (page + box); pdf.js renders that page and we cut the box out,
// so diagrams drawn as vectors survive too, not just embedded bitmaps.

const RENDER_WIDTH = 1700; // px a page is rendered at before cropping
const MAX_FIGURE_W = 1100; // px the stored figure is scaled down to
const PAD = 0.012; // a little margin so labels at the edge of a box aren't clipped

type Page = { canvas: HTMLCanvasElement };

async function renderPdfPages(file: File, pages: number[]): Promise<Map<number, Page>> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  // isEvalSupported: false closes CVE-2024-4367 (font code evaluated as JS) in pdf.js 3.x.
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  const out = new Map<number, Page>();
  for (const n of pages) {
    if (n < 1 || n > doc.numPages) continue;
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.set(n, { canvas });
  }
  await doc.destroy();
  return out;
}

async function renderImage(file: File): Promise<Map<number, Page>> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return new Map([[1, { canvas }]]);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function crop(src: HTMLCanvasElement, b: FigureBox): string | null {
  const x0 = Math.max(0, b.x0 - PAD) * src.width;
  const y0 = Math.max(0, b.y0 - PAD) * src.height;
  const x1 = Math.min(1, b.x1 + PAD) * src.width;
  const y1 = Math.min(1, b.y1 + PAD) * src.height;
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 12 || h < 12) return null;
  const scale = Math.min(1, MAX_FIGURE_W / w);
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, x0, y0, w, h, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.86);
}

/** Figures for each problem index, as data URLs. Problems with no figure are absent. */
export async function cropFigures(file: File, boxes: FigureBox[]): Promise<Map<number, Figure[]>> {
  const result = new Map<number, Figure[]>();
  if (!boxes.length) return result;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const pages = isPdf ? await renderPdfPages(file, Array.from(new Set(boxes.map((b) => b.page)))) : await renderImage(file);
  for (const b of boxes) {
    const page = pages.get(isPdf ? b.page : 1);
    const src = page && crop(page.canvas, b);
    if (!src) continue;
    result.set(b.problemIndex, [...(result.get(b.problemIndex) ?? []), { src, alt: b.caption }]);
  }
  return result;
}

/** data: URL → Blob, for uploading a cropped figure to storage. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}
