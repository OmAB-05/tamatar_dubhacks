"use client";

import { useId, useRef, useState, type FormEvent } from "react";

export default function WaitlistForm() {
  const emailId = useId();
  const pending = useRef(false);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setStatus("pending");
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not join the waitlist. Please try again.");
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Could not connect. Please try again.");
      setStatus("error");
    } finally {
      pending.current = false;
    }
  }

  return (
    <div id="waitlist" className="relative z-10 mt-4 w-full max-w-[520px] scroll-mt-24 text-center">
      <h2 className="text-[1.65rem] leading-tight">a little more time to ripen.</h2>
      <p className="mt-2 text-[1rem] text-ink-2">Our notebook is coming soon. Join the waitlist for early access.</p>
      {status === "success" ? (
        <p role="status" className="sticky-note mt-5 inline-block text-[1.15rem]">you&rsquo;re on the list! we&rsquo;ll email you when it&rsquo;s ready.</p>
      ) : (
        <form onSubmit={submit} className="mt-4 text-left" aria-busy={status === "pending"}>
          <label htmlFor={emailId} className="mb-1 block text-[0.9rem]">your email</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id={emailId} name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254}
              placeholder="you@example.com" disabled={status === "pending"}
              aria-describedby={`${emailId}-note${status === "error" ? ` ${emailId}-error` : ""}`}
              className="hand wb min-h-[52px] min-w-0 flex-1 px-4 text-[1rem] disabled:opacity-60" />
            <button type="submit" disabled={status === "pending"} className="btn btn-red wa !min-h-[52px] !px-6 !text-[1.1rem] disabled:cursor-wait disabled:opacity-60">
              {status === "pending" ? "joining…" : "join the waitlist →"}
            </button>
          </div>
          {status === "error" && <p id={`${emailId}-error`} role="alert" className="mt-2 text-[0.9rem] text-tomato">{error}</p>}
          <p id={`${emailId}-note`} className="mt-2 text-center text-[0.75rem] text-muted">Just your email. We&rsquo;ll only use it for early access and launch updates.</p>
        </form>
      )}
    </div>
  );
}
