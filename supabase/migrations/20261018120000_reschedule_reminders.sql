-- Moving a worksheet's due date re-arms its reminder: students can't touch
-- reminder_sent_at themselves (column grants), so clear it here when due_date changes.

create or replace function public.worksheets_rearm_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.due_date is distinct from old.due_date then
    new.reminder_sent_at := null;
  end if;
  return new;
end;
$$;

create trigger worksheets_rearm_reminder
  before update of due_date on public.worksheets
  for each row execute function public.worksheets_rearm_reminder();
