do $$
begin
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
