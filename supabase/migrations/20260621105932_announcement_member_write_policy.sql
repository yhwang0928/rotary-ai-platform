create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null
    and not exists (
      select 1
      from pg_trigger
      where tgname = 'set_announcements_updated_at'
    )
  then
    create trigger set_announcements_updated_at
      before update on public.announcements
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

alter table public.announcements enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'announcements'
      and policyname = 'announcements read authenticated'
  ) then
    create policy "announcements read authenticated"
      on public.announcements
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'announcements'
      and policyname = 'announcements insert authenticated'
  ) then
    create policy "announcements insert authenticated"
      on public.announcements
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'announcements'
      and policyname = 'announcements delete creator or admin'
  ) then
    create policy "announcements delete creator or admin"
      on public.announcements
      for delete
      to authenticated
      using (created_by = auth.uid() or private.is_admin());
  end if;
end $$;

grant select, insert, delete on public.announcements to authenticated;
