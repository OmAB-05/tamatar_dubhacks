"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "./store";

/**
 * Pages with homework need an account when Supabase is configured: send signed-out
 * visitors to /login (and back here afterwards). Returns true once the page may render.
 */
export function useAccountGate(): boolean {
  const { ready, authReady, needsAccount, account, name } = useStore();
  const router = useRouter();
  const path = usePathname();
  const blocked = needsAccount && authReady && !account;

  useEffect(() => {
    if (!ready || !authReady) return;
    if (blocked) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (!name) router.replace("/welcome");
  }, [ready, authReady, blocked, name, path, router]);

  return ready && authReady && !blocked && !!name;
}
