alter table public.projects
  add column if not exists owner_names text,
  add column if not exists project_purpose text,
  add column if not exists project_background text,
  add column if not exists participating_units text,
  add column if not exists budget_range text;
