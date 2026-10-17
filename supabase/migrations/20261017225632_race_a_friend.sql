-- Race a friend (context.md P2 #11): two players race through the same homework
-- with a live scoreboard. Players sign in anonymously (no accounts); RLS scopes
-- every write to the player's own row.
--
-- Trust model: progress counts are reported by each player's browser, so a
-- determined player can fake their own score. Fine for a friendly race; move the
-- writes into /api/check (server-verified) if scores ever matter.

-- ---------- Tables ----------

create table public.races (
  id uuid primary key default gen_random_uuid(),
  -- Short share code for tamatar.si/race/<code>. Collisions are rejected by the
  -- unique constraint; the client retries with a new insert.
  code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)
    check (code ~ '^[a-z0-9]{6}$'),
  homework_id text not null check (char_length(homework_id) between 1 and 100),
  problem_ids text[] not null check (cardinality(problem_ids) between 1 and 20),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day'
);

create table public.race_players (
  race_id uuid not null references public.races (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  done smallint not null default 0 check (done between 0 and 20),
  slips smallint not null default 0 check (slips between 0 and 999),
  rot smallint not null default 0 check (rot between 0 and 3), -- TomatoState
  finished_at timestamptz,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (race_id, user_id)
);

create index race_players_user_id_idx on public.race_players (user_id);

-- ---------- Helpers (non-exposed schema) ----------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Membership check used by the race_players SELECT policy. A policy on
-- race_players can't query race_players under RLS without recursing, so this
-- runs as definer. It lives outside the exposed schemas and only ever answers
-- for the calling user (auth.uid()).
create function private.is_race_member(target_race uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.race_players p
    where p.race_id = target_race and p.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_race_member(uuid) from public, anon;
grant execute on function private.is_race_member(uuid) to authenticated;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger race_players_touch_updated_at
  before update on public.race_players
  for each row execute function private.touch_updated_at();

-- ---------- Row Level Security ----------

alter table public.races enable row level security;
alter table public.race_players enable row level security;

-- Anyone signed in (anonymous players included) can look up a live race by its
-- code; that's how the friend's link works. Rows hold no personal data.
create policy "read live races" on public.races
  for select to authenticated
  using (expires_at > now());

create policy "create own race" on public.races
  for insert to authenticated
  with check (created_by = (select auth.uid()));

-- Scoreboard rows are visible only to players in the same race.
create policy "read players in my races" on public.race_players
  for select to authenticated
  using ((select private.is_race_member(race_id)));

-- Join as yourself, only into a race that hasn't expired.
create policy "join live race as self" on public.race_players
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.races r where r.id = race_id and r.expires_at > now())
  );

create policy "update own progress" on public.race_players
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Data API exposure ----------
-- New tables are no longer exposed automatically (Supabase changelog, 2026-04-28),
-- so grant exactly what the client needs. anon gets nothing: anonymous sign-ins
-- use the authenticated role.

revoke all on public.races, public.race_players from anon, authenticated;
grant select, insert on public.races to authenticated;
grant select, insert on public.race_players to authenticated;
grant update (done, slips, rot, finished_at) on public.race_players to authenticated;

-- ---------- Realtime ----------
-- Live scoreboard via postgres_changes; RLS above decides who receives each row.

alter publication supabase_realtime add table public.race_players;
