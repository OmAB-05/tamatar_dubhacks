"use client";

import { forwardRef, useRef } from "react";
import { shake } from "@/lib/motion";
import { useStore } from "@/lib/store";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "plain" | "red" | "pink" | "ghost";
  /** When set, the button is "not yet": tapping shakes it and shows this reason as a toast. */
  disabledReason?: string | null;
};

/** Hand-drawn button: random-tilt press, ink fill on red, shake + reason when disabled (§3.2). */
const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "plain", disabledReason, className = "", style, onClick, onPointerDown, children, ...rest },
  ref,
) {
  const { toast } = useStore();
  const tilt = useRef((Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5));
  const disabled = !!disabledReason;

  const release = (e: React.PointerEvent<HTMLButtonElement>) => e.currentTarget.classList.remove("pressed");

  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={disabled || undefined}
      className={`btn ${variant !== "plain" ? `btn-${variant}` : ""} ${className}`}
      style={{ ["--tilt" as string]: `${tilt.current}deg`, ...style }}
      onPointerDown={(e) => {
        if (!disabled) e.currentTarget.classList.add("pressed");
        onPointerDown?.(e);
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={(e) => {
        if (disabled) {
          shake(e.currentTarget);
          toast(disabledReason!);
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
