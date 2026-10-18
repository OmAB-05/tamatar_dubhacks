"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import Tomato from "@/components/Tomato";
import { signIn, signUp, supabaseConfigured } from "@/lib/cloud";
import { useStore } from "@/lib/store";

type Mode = "login" | "signup";

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.95rem] text-ink-2">{label}</span>
      <input {...rest} className="hand wa w-full bg-white px-4 py-2 text-[1.2rem] outline-none focus:border-tomato" />
    </label>
  );
}

/** Log in / sign up with email + password (Supabase Auth). */
function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/home";
  const { account, authReady } = useStore();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const newAccount = useRef(false);

  // Signed in (just now, already, or via an email confirmation link): go on. New accounts take the tour.
  useEffect(() => {
    if (authReady && account) router.replace(!account.name ? "/welcome" : newAccount.current ? "/tour" : next);
  }, [authReady, account, next, router]);

  const reason = busy
    ? "one second…"
    : mode === "signup" && !name.trim()
      ? "tell me your name first"
      : !/^\S+@\S+\.\S+$/.test(email.trim())
        ? "type your email"
        : password.length < 6
          ? "passwords need at least 6 characters"
          : null;

  const submit = async () => {
    if (reason) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        newAccount.current = true;
        const result = await signUp(name.trim(), email.trim(), password);
        if (result === "confirm") setConfirm(true);
      } else {
        await signIn(email.trim(), password);
        // the session listener redirects
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <main className="grid h-[100dvh] place-items-center p-6 text-center">
        <div className="max-w-[28rem]">
          <h1 className="text-[2rem]">Accounts aren&apos;t set up</h1>
          <p className="mt-3 text-ink-2">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local to turn on log in. Until then your work stays in this browser.</p>
          <Link href="/home" className="btn btn-red wc mt-6 inline-flex">go to my homework</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] grid-cols-1 bg-white md:grid-cols-2">
      <div className="flex min-w-0 flex-col px-[6vw] pb-10 pt-[10dvh]">
        <Link href="/" className="mb-8 text-[1.5rem] leading-none">
          tamatar<span className="text-tomato">.si</span>
        </Link>
        <h1 className="leading-[1.05]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
          {confirm ? "Check your email" : mode === "login" ? "Welcome back" : "Make your account"}
          <br />
          <span className="text-faint">{confirm ? "then come back here" : mode === "login" ? "pick up where you left off" : "so your homework follows you"}</span>
        </h1>

        {confirm ? (
          <div className="mt-8 max-w-[28rem]">
            <p className="sticky-note p-4 text-[1.05rem]">
              We sent a link to <span className="text-tomato">{email}</span>. Open it to confirm your account, and you&apos;ll land back here signed in.
            </p>
            <button type="button" className="link mt-6 text-[0.95rem] text-muted" onClick={() => { setConfirm(false); setMode("login"); }}>
              already confirmed? log in
            </button>
          </div>
        ) : (
          <form
            className="mt-8 flex max-w-[28rem] flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div role="tablist" className="mb-1 flex gap-2">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => { setMode(m); setError(null); }}
                  className={`rounded-full px-4 py-1 text-[1rem] transition-colors ${mode === m ? "bg-blush text-tomato" : "text-ink-2 hover:bg-panel"}`}
                >
                  {m === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>
            {mode === "signup" && (
              <Field label="your name" value={name} maxLength={24} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
            )}
            <Field label="email" type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
            <Field
              label="password"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p role="alert" className="text-[0.95rem] text-tomato">{error}</p>}
            <Button type="submit" variant="red" className="wc mt-2 self-start !px-8 !text-[1.25rem]" disabledReason={reason}>
              {busy ? "…" : mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>
        )}
      </div>
      <div className="hidden items-center justify-center bg-panel md:flex">
        <div style={{ animation: "hero-drop 900ms var(--pop) both" }}>
          <Tomato cssSize="min(36vw, 64dvh)" bubbleClass="text-[1.4rem]" />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
