-- Onboarding profile (email, US phone, school) and the Tamatar iMessage bot (photon-bot/):
-- due-date reminders for uploaded worksheets and "come back and focus" nudges.
-- The bot reads these tables with the Supabase secret key (bypasses RLS); the browser
-- only ever touches the signed-in user's own rows.

-- ---------- Profiles ----------

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254),
  -- E.164, US numbers only (NANP: area code and exchange can't start with 0 or 1).
  phone text not null check (phone ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$'),
  institution text not null check (char_length(institution) between 2 and 120),
  -- IANA zone from the browser, so "the day it's due" is the student's day, not UTC's.
  timezone text not null default 'America/Los_Angeles' check (char_length(timezone) between 1 and 64),
  -- The bot only texts students who said yes; replying STOP to the bot turns this off.
  messages_opt_in boolean not null default false,
  -- Written by the bot only (rate limit for inactivity nudges).
  last_nudge_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_phone_idx on public.profiles (phone);

-- private.touch_updated_at() comes from the race_a_friend migration.
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "create own profile" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Column grants: students can't edit the bot's bookkeeping.
grant insert (user_id, email, phone, institution, timezone, messages_opt_in) on public.profiles to authenticated;
grant update (email, phone, institution, timezone, messages_opt_in) on public.profiles to authenticated;

-- ---------- Worksheet due dates ----------

-- `due` stays the display label; `due_date` is the calendar day the bot reminds on.
alter table public.worksheets
  add column due_date date,
  add column reminder_sent_at timestamptz;

create index worksheets_due_reminder_idx on public.worksheets (due_date)
  where reminder_sent_at is null and due_date is not null;

-- Students may set the due date, not mark their own reminder as sent.
revoke update on public.worksheets from authenticated;
grant update (title, course, due, due_date, problems) on public.worksheets to authenticated;
