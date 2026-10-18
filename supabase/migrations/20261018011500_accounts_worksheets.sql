-- Accounts (email + password via Supabase Auth), each user's uploaded worksheets,
-- their saved ink and progress per problem, and a private bucket for the figures
-- cropped out of uploaded worksheets. Every row and file is scoped to its owner by RLS.

-- ---------- Tables ----------

-- An uploaded worksheet, stored as the app's own homework: problem statements,
-- references (and the server-signed check tokens) and figure paths live in `problems`.
create table public.worksheets (
  id text primary key check (id ~ '^hw-[0-9a-f-]{36}$'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  course text not null default 'Imported homework' check (char_length(course) <= 100),
  due text check (char_length(due) <= 100),
  problems jsonb not null check (jsonb_typeof(problems) = 'array' and jsonb_array_length(problems) between 1 and 20),
  created_at timestamptz not null default now()
);

create index worksheets_user_id_idx on public.worksheets (user_id, created_at desc);

-- One row per (user, problem): which parts are done, and the student's ink so work
-- follows the account across devices. Built-in problems use their fixed ids
-- ("ramp-frictionless"); uploaded ones use "import-<uuid>".
create table public.problem_work (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  problem_id text not null check (char_length(problem_id) between 1 and 100),
  progress jsonb not null default '{"fbd": false, "equations": false}'::jsonb,
  answer jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

-- private.touch_updated_at() comes from the race_a_friend migration.
create trigger problem_work_touch_updated_at
  before update on public.problem_work
  for each row execute function private.touch_updated_at();

-- ---------- Row Level Security ----------

alter table public.worksheets enable row level security;
alter table public.problem_work enable row level security;

create policy "read own worksheets" on public.worksheets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "create own worksheets" on public.worksheets
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own worksheets" on public.worksheets
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own worksheets" on public.worksheets
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "read own work" on public.problem_work
  for select to authenticated using (user_id = (select auth.uid()));
create policy "create own work" on public.problem_work
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own work" on public.problem_work
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own work" on public.problem_work
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- Data API exposure ----------

revoke all on public.worksheets, public.problem_work from anon, authenticated;
grant select, insert, update, delete on public.worksheets to authenticated;
grant select, insert, update, delete on public.problem_work to authenticated;

-- ---------- Storage: worksheet figures ----------
-- Files live at <user id>/<worksheet id>/<problem id>-<n>.jpg. Private bucket: the
-- app reads them through short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('worksheet-figures', 'worksheet-figures', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "read own figures" on storage.objects
  for select to authenticated
  using (bucket_id = 'worksheet-figures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "upload own figures" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'worksheet-figures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own figures" on storage.objects
  for update to authenticated
  using (bucket_id = 'worksheet-figures' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'worksheet-figures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own figures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'worksheet-figures' and (storage.foldername(name))[1] = (select auth.uid())::text);
