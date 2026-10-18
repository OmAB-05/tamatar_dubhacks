"use client";

import { useEffect, useState } from "react";
import { figureUrl } from "@/lib/cloud";
import type { Figure } from "@/lib/types";

/** A worksheet figure. "sb:" figures live in private storage and load through a signed URL. */
export default function FigureImage({ figure, className = "" }: { figure: Figure; className?: string }) {
  const [src, setSrc] = useState(figure.src.startsWith("sb:") ? null : figure.src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!figure.src.startsWith("sb:")) {
      setSrc(figure.src);
      return;
    }
    let live = true;
    figureUrl(figure.src).then((u) => live && setSrc(u), () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [figure.src]);

  if (failed) return <div className={`grid place-items-center text-[0.75rem] text-faint ${className}`}>figure unavailable</div>;
  if (!src) return <div className={`animate-pulse bg-panel ${className}`} aria-label="loading figure" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={figure.alt || "worksheet figure"} className={`object-contain ${className}`} draggable={false} />;
}
