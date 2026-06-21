do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meetings'
      and policyname = 'meetings delete project members'
  ) then
    create policy "meetings delete project members"
      on public.meetings
      for delete
      to authenticated
      using (project_id is null or private.can_read_project(project_id));
  end if;
end $$;

grant delete on public.meetings to authenticated;
