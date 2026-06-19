alter table public.projects
  add column if not exists drive_folder_label text,
  add column if not exists drive_folder_purpose text;

alter table public.tasks
  add column if not exists owner_names text,
  add column if not exists collaborator_names text,
  add column if not exists output_title text,
  add column if not exists completed_date date,
  add column if not exists source_sheet text,
  add column if not exists source_row integer;

alter table public.meetings
  add column if not exists source_sheet text,
  add column if not exists source_row integer;

alter table public.action_items
  add column if not exists owner_names text,
  add column if not exists collaborator_names text,
  add column if not exists source_sheet text,
  add column if not exists source_row integer;

create index if not exists tasks_source_sheet_row_idx on public.tasks (source_sheet, source_row);
create index if not exists meetings_source_sheet_row_idx on public.meetings (source_sheet, source_row);
create index if not exists action_items_source_sheet_row_idx on public.action_items (source_sheet, source_row);
