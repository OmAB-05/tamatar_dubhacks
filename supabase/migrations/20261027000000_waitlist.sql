-- Emails are private: no browser role can list, update, or delete signups.
create table public.waitlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint waitlist_email_valid check (
    email = lower(btrim(email)) and char_length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

-- Insert-only function keeps duplicates private and makes retries idempotent.
create or replace function public.join_waitlist(signup_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.waitlist (email)
  values (lower(btrim(signup_email)))
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text) from public;
grant execute on function public.join_waitlist(text) to anon, authenticated;
