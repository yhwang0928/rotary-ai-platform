do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'announcements'
      and policyname = 'announcements update creator or admin'
  ) then
    create policy "announcements update creator or admin"
      on public.announcements
      for update
      to authenticated
      using (created_by = auth.uid() or private.is_admin())
      with check (created_by = auth.uid() or private.is_admin());
  end if;
end $$;

grant update on public.announcements to authenticated;
