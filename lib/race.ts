import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { TomatoState } from "./types";

// Race a friend over Supabase: anonymous sign-in, a race row with a share code,
// one player row each, and a realtime scoreboard. Schema and RLS:
// supabase/migrations/*_race_a_friend.sql.

export type Race = { id: string; code: string; homeworkId: string; problemIds: string[] };

export type RacePlayer = {
  userId: string;
  name: string;
  done: number;
  slips: number;
  rot: TomatoState;
  finishedAt: string | null;
};

type RaceRow = { id: string; code: string; homework_id: string; problem_ids: string[] };
type PlayerRow = {
  user_id: string;
  name: string;
  done: number;
  slips: number;
  rot: number;
  finished_at: string | null;
};

const toRace = (r: RaceRow): Race => ({ id: r.id, code: r.code, homeworkId: r.homework_id, problemIds: r.problem_ids });
const toPlayer = (p: PlayerRow): RacePlayer => ({
  userId: p.user_id,
  name: p.name,
  done: p.done,
  slips: p.slips,
  rot: p.rot as TomatoState,
  finishedAt: p.finished_at,
});

export const raceLink = (code: string) => `https://tamatar.si/race/${code}`;

function db() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY)");
  return supabase;
}

/** Anonymous session, created once per browser and reused after reloads. */
async function ensureSession(): Promise<string> {
  const supabase = db();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signedIn.user) throw new Error(`Could not start a race session: ${error?.message ?? "no user"}`);
  return signedIn.user.id;
}

async function addPlayer(raceId: string, name: string): Promise<void> {
  // No .select() here: the RETURNING row is filtered by the membership policy,
  // which can't see this player's row until the insert commits.
  const { error } = await db().from("race_players").insert({ race_id: raceId, name: name.slice(0, 24) || "you" });
  if (error && error.code !== "23505") throw new Error(`Could not join the race: ${error.message}`); // 23505: already joined
}

export async function createRace(homeworkId: string, problemIds: string[], name: string): Promise<Race> {
  await ensureSession();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db()
      .from("races")
      .insert({ homework_id: homeworkId, problem_ids: problemIds })
      .select("id, code, homework_id, problem_ids")
      .single<RaceRow>();
    if (error?.code === "23505") continue; // share-code collision: try a new default code
    if (error || !data) throw new Error(`Could not create the race: ${error?.message ?? "no row"}`);
    await addPlayer(data.id, name);
    return toRace(data);
  }
  throw new Error("Could not create a unique race code");
}

export async function joinRace(code: string, name: string): Promise<Race> {
  await ensureSession();
  const { data, error } = await db()
    .from("races")
    .select("id, code, homework_id, problem_ids")
    .eq("code", code.toLowerCase())
    .maybeSingle<RaceRow>();
  if (error) throw new Error(`Could not load the race: ${error.message}`);
  if (!data) throw new Error("That race link has expired or doesn't exist");
  await addPlayer(data.id, name);
  return toRace(data);
}

export async function listPlayers(raceId: string): Promise<RacePlayer[]> {
  const { data, error } = await db()
    .from("race_players")
    .select("user_id, name, done, slips, rot, finished_at")
    .eq("race_id", raceId)
    .returns<PlayerRow[]>();
  if (error) throw new Error(`Could not load the scoreboard: ${error.message}`);
  return (data ?? []).map(toPlayer);
}

/** Report this player's progress after each check. Only done/slips/rot/finished can change. */
export async function updateProgress(
  raceId: string,
  progress: { done: number; slips: number; rot: TomatoState; finished?: boolean },
): Promise<void> {
  const userId = await ensureSession();
  const { error } = await db()
    .from("race_players")
    .update({
      done: progress.done,
      slips: progress.slips,
      rot: progress.rot,
      ...(progress.finished ? { finished_at: new Date().toISOString() } : {}),
    })
    .eq("race_id", raceId)
    .eq("user_id", userId);
  if (error) throw new Error(`Could not update race progress: ${error.message}`);
}

/**
 * Live scoreboard: calls onChange with the full player list now and after every
 * join or progress update. Returns an unsubscribe function.
 */
export function subscribeToRace(raceId: string, onChange: (players: RacePlayer[]) => void): () => void {
  const supabase = db();
  const refresh = () => listPlayers(raceId).then(onChange).catch(() => {});
  const channel: RealtimeChannel = supabase
    .channel(`race:${raceId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "race_players", filter: `race_id=eq.${raceId}` }, refresh)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") refresh();
    });
  return () => {
    supabase.removeChannel(channel);
  };
}
