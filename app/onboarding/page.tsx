"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Button from "@/components/Button";
import Tomato from "@/components/Tomato";
import { useStore } from "@/lib/store";

function Field({ label, hint, ...rest }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.95rem] text-ink-2">{label}</span>
      <input {...rest} className="hand wa w-full bg-white px-4 py-2 text-[1.2rem] outline-none focus:border-tomato" />
      {hint && <span className="mt-1 block text-[0.8rem] text-muted">{hint}</span>}
    </label>
  );
}

/** US numbers only: 10 digits (an optional leading 1 is dropped), area code and exchange can't start with 0/1. */
function toUsE164(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) ? `+1${d}` : null;
}

/** "2065550123" → "(206) 555-0123" as the student types. */
function formatUs(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const SCHOOLS = [
  "University of Washington",
  "Washington State University",
  "Seattle University",
  "Western Washington University",
  "Stanford University",
  "UC Berkeley",
  "UCLA",
  "MIT",
  "Georgia Tech",
  "University of Michigan",
];

/** Onboarding after sign-up: email, US phone number, and school. */
function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/home";
  const { account, authReady, needsAccount, profile, saveProfile } = useStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [institution, setInstitution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!needsAccount) router.replace(next);
    else if (!account) router.replace(`/login?mode=signup&next=${encodeURIComponent(`/onboarding?next=${next}`)}`);
  }, [authReady, needsAccount, account, next, router]);

  // Prefill: the account's email, or what they entered before (editing).
  useEffect(() => {
    if (profile) {
      setEmail(profile.email);
      setPhone(formatUs(profile.phone.slice(2)));
      setInstitution(profile.institution);
    } else if (account) setEmail((e) => e || account.email);
  }, [profile, account]);

  const e164 = toUsE164(phone);
  const reason = busy
    ? "one second…"
    : !/^\S+@\S+\.\S+$/.test(email.trim())
      ? "type your email"
      : !e164
        ? "type a US phone number"
        : institution.trim().length < 2
          ? "tell me your school"
          : null;

  const submit = async () => {
    if (reason || !e164) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile({
        email: email.trim(),
        phone: e164,
        institution: institution.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
      });
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-[100dvh] grid-cols-1 bg-white md:grid-cols-2">
      <div className="flex min-w-0 flex-col px-[6vw] pb-10 pt-[10dvh]">
        <div className="mb-8 text-[1.5rem] leading-none">
          tamatar<span className="text-tomato">.si</span>
        </div>
        <h1 className="leading-[1.05]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
          {profile ? "Your details" : "Almost there"}
          <br />
          <span className="text-faint">so I can keep you on track</span>
        </h1>

        <form
          className="mt-8 flex max-w-[28rem] flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="email" type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
          <Field
            label="phone number"
            hint="US numbers only."
            type="tel"
            inputMode="tel"
            placeholder="(206) 555-0123"
            value={phone}
            autoComplete="tel-national"
            onChange={(e) => setPhone(formatUs(e.target.value))}
          />
          <Field
            label="school"
            list="schools"
            placeholder="University of Washington"
            value={institution}
            maxLength={120}
            autoComplete="organization"
            onChange={(e) => setInstitution(e.target.value)}
          />
          <datalist id="schools">
            {SCHOOLS.map((s) => <option key={s} value={s} />)}
          </datalist>
          {error && <p role="alert" className="text-[0.95rem] text-tomato">{error}</p>}
          <Button type="submit" variant="red" className="wc mt-2 self-start !px-8 !text-[1.25rem]" disabledReason={reason}>
            {busy ? "…" : profile ? "Save" : "Let's go"}
          </Button>
        </form>
      </div>
      <div className="hidden items-center justify-center bg-panel md:flex">
        <div style={{ animation: "hero-drop 900ms var(--pop) both" }}>
          <Tomato cssSize="min(36vw, 64dvh)" bubbleClass="text-[1.4rem]" />
        </div>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}
