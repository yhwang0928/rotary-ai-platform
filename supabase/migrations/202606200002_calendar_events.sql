create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  event_date date not null,
  description text,
  location text,
  url text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_event_date_idx
  on public.calendar_events (event_date);

create index if not exists calendar_events_project_id_idx
  on public.calendar_events (project_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_calendar_events_updated_at'
  ) then
    create trigger set_calendar_events_updated_at
      before update on public.calendar_events
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.calendar_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and policyname = 'calendar events read authenticated'
  ) then
    create policy "calendar events read authenticated"
      on public.calendar_events
      for select
      to authenticated
      using (project_id is null or private.can_read_project(project_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and policyname = 'calendar events insert authenticated'
  ) then
    create policy "calendar events insert authenticated"
      on public.calendar_events
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and (project_id is null or private.can_read_project(project_id))
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and policyname = 'calendar events update creator or admin'
  ) then
    create policy "calendar events update creator or admin"
      on public.calendar_events
      for update
      to authenticated
      using (created_by = auth.uid() or private.is_admin())
      with check (
        (created_by = auth.uid() or private.is_admin())
        and (project_id is null or private.can_read_project(project_id))
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'calendar_events'
      and policyname = 'calendar events delete creator or admin'
  ) then
    create policy "calendar events delete creator or admin"
      on public.calendar_events
      for delete
      to authenticated
      using (created_by = auth.uid() or private.is_admin());
  end if;
end $$;

grant select, insert, update, delete on public.calendar_events to authenticated;
