-- Hospitalist OS v1.5: run in YOUR Supabase project SQL Editor.
-- Do not place this SQL or your database credentials in the public website.
-- Only operational, patient-free data may be stored.
create table if not exists public.hospitalist_os_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint payload_size_limit check (octet_length(payload::text) < 2000000)
);
alter table public.hospitalist_os_snapshots enable row level security;
revoke all on public.hospitalist_os_snapshots from public, anon, authenticated;
grant select on public.hospitalist_os_snapshots to authenticated;
drop policy if exists "read own snapshot" on public.hospitalist_os_snapshots;
create policy "read own snapshot" on public.hospitalist_os_snapshots
for select to authenticated using ((select auth.uid()) = user_id);

-- All writes flow through an atomic compare-and-swap RPC. One update cannot
-- accidentally overwrite a newer cloud revision from another device.
create or replace function public.hospitalist_os_save_snapshot(
  expected_revision bigint,
  new_payload jsonb
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  next_revision bigint;
begin
  if actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if new_payload is null or jsonb_typeof(new_payload) <> 'object' or octet_length(new_payload::text) >= 2000000 then
    raise exception 'Invalid or oversized payload' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.hospitalist_os_snapshots(user_id, revision, payload)
    values (actor, 1, new_payload)
    on conflict (user_id) do nothing
    returning revision into next_revision;
    if next_revision is not null then return next_revision; end if;
  end if;
  update public.hospitalist_os_snapshots
     set payload = new_payload,
         revision = revision + 1,
         updated_at = now()
   where user_id = actor and revision = expected_revision
   returning revision into next_revision;
  if next_revision is null then
    raise exception 'Cloud revision changed; refresh and merge first' using errcode = '40001';
  end if;
  return next_revision;
end;
$$;
revoke execute on function public.hospitalist_os_save_snapshot(bigint,jsonb) from public, anon;
grant execute on function public.hospitalist_os_save_snapshot(bigint,jsonb) to authenticated;
