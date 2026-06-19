create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx on public.announcements (created_at desc);

drop trigger if exists set_announcements_updated_at on public.announcements;

create trigger set_announcements_updated_at
  before update on public.announcements
  for each row
  execute function public.set_updated_at();

alter table public.announcements enable row level security;

create policy "announcements read authenticated"
  on public.announcements
  for select
  to authenticated
  using (true);

create policy "announcements insert admins"
  on public.announcements
  for insert
  to authenticated
  with check (private.is_admin());

create policy "announcements delete admins"
  on public.announcements
  for delete
  to authenticated
  using (private.is_admin());

grant select, insert, delete on public.announcements to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meetings'
      and policyname = 'meetings delete project managers'
  ) then
    create policy "meetings delete project managers"
      on public.meetings
      for delete
      to authenticated
      using (project_id is null or private.can_manage_project(project_id));
  end if;
end $$;

grant delete on public.meetings to authenticated;
