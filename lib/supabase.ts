import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client for Race a friend (the only Supabase feature so far).
// Uses the publishable key only; RLS in supabase/migrations decides what each
// player can read and write. Never put a secret / service_role key here: every
// NEXT_PUBLIC_ variable ships to the browser.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

/** null when Supabase isn't configured, so callers can fall back to the simulated race. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured || typeof window === "undefined") return null;
  client ??= createClient(url!, publishableKey!, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}
