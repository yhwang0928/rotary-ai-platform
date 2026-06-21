do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'projects update project members'
  ) then
    create policy "projects update project members"
      on public.projects
      for update
      to authenticated
      using (private.can_read_project(id))
      with check (private.can_read_project(id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tasks'
      and policyname = 'tasks update project members'
  ) then
    create policy "tasks update project members"
      on public.tasks
      for update
      to authenticated
      using (private.can_read_project(project_id))
      with check (private.can_read_project(project_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meetings'
      and policyname = 'meetings update project members'
  ) then
    create policy "meetings update project members"
      on public.meetings
      for update
      to authenticated
      using (project_id is null or private.can_read_project(project_id))
      with check (project_id is null or private.can_read_project(project_id));
  end if;
end $$;
