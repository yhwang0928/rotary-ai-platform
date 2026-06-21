alter table public.projects
  add column if not exists start_date date,
  add column if not exists expected_end_date date,
  add constraint projects_expected_end_after_start
    check (expected_end_date is null or start_date is null or expected_end_date >= start_date)
    not valid;

alter table public.projects validate constraint projects_expected_end_after_start;
