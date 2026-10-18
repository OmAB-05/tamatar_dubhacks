"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "./store";

/**
 * Pages with homework need an account when Supabase is configured: send signed-out
 * visitors to /login, and accounts that haven't onboarded (phone, school) to /onboarding,
 * then back here afterwards. Returns true once the page may render.
 */
export function useAccountGate(): boolean {
  const { ready, authReady, needsAccount, account, name, profile } = useStore();
  const router = useRouter();
  const path = usePathname();
  const blocked = needsAccount && authReady && !account;
  const onboard = !!account && profile === null;

  useEffect(() => {
    if (!ready || !authReady) return;
    if (blocked) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (!name) router.replace("/welcome");
    else if (onboard) router.replace(`/onboarding?next=${encodeURIComponent(path)}`);
  }, [ready, authReady, blocked, name, onboard, path, router]);

  return ready && authReady && !blocked && !!name && !onboard;
}
