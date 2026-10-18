"use client";

import type { Session, User } from "@supabase/supabase-js";
import type { Homework } from "@/data/problems";
import { dataUrlToBlob } from "./figures";
import type { PartProgress } from "./progress";
import type { Answer } from "./store";
import { getSupabase, supabaseConfigured } from "./supabase";

// Accounts and per-user data on Supabase. Schema and RLS:
// supabase/migrations/*_accounts_worksheets.sql. Every call is scoped to the signed-in
// user by RLS, so nothing here passes a user id it hasn't read from the session.

export { supabaseConfigured };

export type Account = { id: string; email: string; name: string };

const BUCKET = "worksheet-figures";
const SIGNED_URL_TTL = 60 * 60; // seconds

function db() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Accounts need Supabase (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).");
  return supabase;
}

/** Anonymous sessions (Race a friend) are not accounts. */
export function toAccount(user: User | null | undefined): Account | null {
  if (!user || user.is_anonymous) return null;
  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  return { id: user.id, email: user.email ?? "", name };
}

export function onAuthChange(cb: (account: Account | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) {
    cb(null);
    return () => {};
  }
  supabase.auth.getSession().then(({ data }) => cb(toAccount(data.session?.user)));
  const { data } = supabase.auth.onAuthStateChange((_event, session: Session | null) => cb(toAccount(session?.user)));
  return () => data.subscription.unsubscribe();
}

const friendly = (message: string) =>
  /invalid login credentials/i.test(message)
    ? "That email and password don't match."
    : /already registered|already exists/i.test(message)
      ? "There's already an account with that email. Try logging in."
      : /password/i.test(message) && /characters|least/i.test(message)
        ? "Use a password with at least 6 characters."
        : message;

/** Returns "confirm" when the project requires email confirmation before the first login. */
export async function signUp(name: string, email: string, password: string): Promise<"signed-in" | "confirm"> {
  const supabase = db();
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user.is_anonymous) await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${window.location.origin}/login` },
  });
  if (error) throw new Error(friendly(error.message));
  // Supabase hides "already registered" behind an empty identities list when confirmation is on.
  if (data.user && !data.user.identities?.length) throw new Error(friendly("already registered"));
  return data.session ? "signed-in" : "confirm";
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error.message));
}

export async function signOut(): Promise<void> {
  await db().auth.signOut();
}

export async function updateName(name: string): Promise<void> {
  const { error } = await db().auth.updateUser({ data: { name } });
  if (error) throw new Error(error.message);
}

// ---------- Profile (onboarding) ----------

/** Filled in once after sign-up (app/onboarding). */
export type Profile = { email: string; phone: string; institution: string; timezone: string };

type ProfileRow = { email: string; phone: string; institution: string; timezone: string };

/** null until the student finishes onboarding. */
export async function loadProfile(): Promise<Profile | null> {
  const { data, error } = await db().from("profiles").select("email, phone, institution, timezone").maybeSingle();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  if (!data) return null;
  const r = data as ProfileRow;
  return { email: r.email, phone: r.phone, institution: r.institution, timezone: r.timezone };
}

export async function saveProfile(userId: string, p: Profile): Promise<void> {
  const { error } = await db()
    .from("profiles")
    .upsert(
      { user_id: userId, email: p.email, phone: p.phone, institution: p.institution, timezone: p.timezone },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(/profiles_phone_idx/.test(error.message) ? "That phone number is already on another account." : `Could not save your profile: ${error.message}`);
}

// ---------- Worksheets ----------

type WorksheetRow = { id: string; title: string; course: string; due: string | null; due_date: string | null; problems: Homework["problems"]; created_at: string };

export async function loadWorksheets(): Promise<Homework[]> {
  const { data, error } = await db()
    .from("worksheets")
    .select("id, title, course, due, due_date, problems, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your worksheets: ${error.message}`);
  return (data as WorksheetRow[]).map((r) => ({ id: r.id, title: r.title, course: r.course, due: r.due, dueDate: r.due_date, problems: r.problems, createdAt: r.created_at }));
}

/**
 * Upload each data: URL figure to storage (replacing it with an "sb:" path), then save
 * the worksheet row. Returns the worksheet as stored.
 */
export async function saveWorksheet(userId: string, hw: Homework): Promise<Homework> {
  const supabase = db();
  const problems = await Promise.all(
    hw.problems.map(async (p) => {
      if (!p.figures?.length) return p;
      const figures = await Promise.all(
        p.figures.map(async (f, i) => {
          if (!f.src.startsWith("data:")) return f;
          const blob = await dataUrlToBlob(f.src);
          const ext = blob.type === "image/png" ? "png" : "jpg";
          const path = `${userId}/${hw.id}/${p.id}-${i}.${ext}`;
          const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
          if (error) throw new Error(`Could not save a figure: ${error.message}`);
          return { ...f, src: `sb:${path}` };
        }),
      );
      return { ...p, figures };
    }),
  );
  const row = { id: hw.id, title: hw.title.slice(0, 200), course: hw.course, due: hw.due, due_date: hw.dueDate ?? null, problems };
  const { error } = await supabase.from("worksheets").insert(row);
  if (error) throw new Error(`Could not save the worksheet: ${error.message}`);
  return { ...hw, problems };
}

const signed = new Map<string, { url: string; until: number }>();

/** "sb:<path>" → a signed URL (cached until shortly before it expires). Other srcs pass through. */
export async function figureUrl(src: string): Promise<string> {
  if (!src.startsWith("sb:")) return src;
  const path = src.slice(3);
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data) throw new Error(`Could not load a figure: ${error?.message ?? "no URL"}`);
  signed.set(path, { url: data.signedUrl, until: Date.now() + (SIGNED_URL_TTL - 120) * 1000 });
  return data.signedUrl;
}

// ---------- Saved work ----------

type WorkRow = { problem_id: string; progress: PartProgress; answer: Answer | null };

export async function loadWork(): Promise<{ progress: Record<string, PartProgress>; answers: Record<string, Answer> }> {
  const { data, error } = await db().from("problem_work").select("problem_id, progress, answer");
  if (error) throw new Error(`Could not load your saved work: ${error.message}`);
  const progress: Record<string, PartProgress> = {};
  const answers: Record<string, Answer> = {};
  for (const r of data as WorkRow[]) {
    progress[r.problem_id] = r.progress;
    if (r.answer) answers[r.problem_id] = r.answer;
  }
  return { progress, answers };
}

/** Upsert whole rows: the store holds the latest progress and ink for every problem it saves. */
export async function saveWork(rows: { problemId: string; progress: PartProgress; answer: Answer | null }[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await db()
    .from("problem_work")
    .upsert(
      rows.map((r) => ({ problem_id: r.problemId, progress: r.progress, answer: r.answer })),
      { onConflict: "user_id,problem_id" },
    );
  if (error) throw new Error(error.message);
}
