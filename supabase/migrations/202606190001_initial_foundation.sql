create extension if not exists pgcrypto;

create schema if not exists private;

create type public.app_role as enum ('admin', 'project_lead', 'member', 'viewer');
create type public.project_status as enum ('active', 'paused', 'completed', 'archived');
create type public.project_member_role as enum ('lead', 'member', 'viewer');
create type public.task_status as enum ('backlog', 'todo', 'doing', 'review', 'done', 'blocked', 'cancelled');
create type public.task_priority as enum ('p0', 'p1', 'p2', 'p3');
create type public.requirement_status as enum ('draft', 'reviewing', 'approved', 'in_dev', 'testing', 'released', 'rejected');
create type public.file_kind as enum ('folder', 'document', 'spreadsheet', 'presentation', 'media', 'other');
create type public.entity_type as enum ('project', 'task', 'meeting', 'requirement', 'action_item');
create type public.notification_window as enum ('due_today', 'due_in_3_days', 'due_in_7_days', 'overdue');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  google_drive_root_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  status public.project_status not null default 'active',
  lead_user_id uuid references public.profiles(id) on delete set null,
  google_drive_folder_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.project_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'p2',
  owner_user_id uuid references public.profiles(id) on delete set null,
  collaborator_user_ids uuid[] not null default '{}',
  start_date date,
  due_date date,
  completed_at timestamptz,
  blocker_reason text,
  output_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (due_date is null or start_date is null or due_date >= start_date),
  check ((status = 'blocked') or blocker_reason is null)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_dependencies (
  task_id uuid not null references public.tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  meeting_date date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  agenda text,
  summary text,
  notes text,
  google_calendar_event_id text,
  google_meet_url text,
  notes_doc_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  name text,
  email text,
  created_at timestamptz not null default now(),
  check (user_id is not null or name is not null or email is not null)
);

create table public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  decision text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  due_date date,
  status public.task_status not null default 'todo',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  module text not null,
  title text not null,
  user_role text,
  user_story text,
  acceptance_criteria text,
  status public.requirement_status not null default 'draft',
  priority public.task_priority not null default 'p2',
  owner_user_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requirement_versions (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  version_note text not null,
  snapshot jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_kind public.file_kind not null default 'other',
  google_drive_url text not null,
  google_drive_file_id text,
  owner_name text,
  last_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entity_files (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  unique (file_id, entity_type, entity_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  reminder_window public.notification_window not null,
  channel text not null default 'email',
  status public.notification_status not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, recipient_user_id, reminder_window, channel)
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  notify_project_lead boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type public.entity_type not null,
  entity_id uuid not null,
  project_id uuid references public.projects(id) on delete set null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table public.integration_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_email text,
  owner_user_id uuid references public.profiles(id) on delete set null,
  encrypted_refresh_token text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_calendar_events (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  google_calendar_event_id text not null,
  google_meet_url text,
  organizer_user_id uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (google_calendar_event_id)
);

create index projects_lead_user_id_idx on public.projects (lead_user_id);
create index project_members_user_id_idx on public.project_members (user_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_owner_user_id_idx on public.tasks (owner_user_id);
create index tasks_due_date_idx on public.tasks (due_date) where archived_at is null;
create index meetings_project_id_meeting_date_idx on public.meetings (project_id, meeting_date desc);
create index meeting_attendees_user_id_idx on public.meeting_attendees (user_id);
create index action_items_owner_due_idx on public.action_items (owner_user_id, due_date);
create index requirements_project_id_idx on public.requirements (project_id);
create index entity_files_entity_idx on public.entity_files (entity_type, entity_id);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id, created_at desc);
create index activity_logs_project_id_idx on public.activity_logs (project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_task_comments_updated_at before update on public.task_comments for each row execute function public.set_updated_at();
create trigger set_meetings_updated_at before update on public.meetings for each row execute function public.set_updated_at();
create trigger set_action_items_updated_at before update on public.action_items for each row execute function public.set_updated_at();
create trigger set_requirements_updated_at before update on public.requirements for each row execute function public.set_updated_at();
create trigger set_files_updated_at before update on public.files for each row execute function public.set_updated_at();
create trigger set_notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();
create trigger set_integration_accounts_updated_at before update on public.integration_accounts for each row execute function public.set_updated_at();
create trigger set_google_calendar_events_updated_at before update on public.google_calendar_events for each row execute function public.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name')
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.current_user_role() = 'admin', false)
$$;

create or replace function private.project_role(target_project_id uuid)
returns public.project_member_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.project_members
  where project_id = target_project_id and user_id = auth.uid()
  limit 1
$$;

create or replace function private.can_read_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    private.is_admin()
    or exists (
      select 1
      from public.project_members
      where project_id = target_project_id and user_id = auth.uid()
    ),
    false
  )
$$;

create or replace function private.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(private.is_admin() or private.project_role(target_project_id) = 'lead', false)
$$;

create or replace function private.can_read_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.tasks
      where id = target_task_id and private.can_read_project(project_id)
    ),
    false
  )
$$;

create or replace function private.can_read_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.meetings
      where id = target_meeting_id and (project_id is null or private.can_read_project(project_id))
    ),
    false
  )
$$;

create or replace function private.can_read_requirement(target_requirement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.requirements
      where id = target_requirement_id and (project_id is null or private.can_read_project(project_id))
    ),
    false
  )
$$;

create or replace function private.log_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old is distinct from new then
    insert into public.activity_logs (
      actor_user_id,
      entity_type,
      entity_id,
      project_id,
      action,
      previous_value,
      new_value
    )
    values (
      auth.uid(),
      'task',
      new.id,
      new.project_id,
      'task.updated',
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;

  return new;
end;
$$;

create trigger log_task_update after update on public.tasks for each row execute function private.log_task_update();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.meeting_decisions enable row level security;
alter table public.action_items enable row level security;
alter table public.requirements enable row level security;
alter table public.requirement_versions enable row level security;
alter table public.files enable row level security;
alter table public.entity_files enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.activity_logs enable row level security;
alter table public.integration_accounts enable row level security;
alter table public.google_calendar_events enable row level security;

create policy "profiles read self or admin" on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());
create policy "profiles insert self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update self basics or admin" on public.profiles for update to authenticated using (id = auth.uid() or private.is_admin()) with check (id = auth.uid() or private.is_admin());

create policy "organizations read for signed in users" on public.organizations for select to authenticated using (true);
create policy "organizations admin write" on public.organizations for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "projects read members" on public.projects for select to authenticated using (private.can_read_project(id));
create policy "projects admin insert" on public.projects for insert to authenticated with check (private.is_admin());
create policy "projects manage by admin or lead" on public.projects for update to authenticated using (private.can_manage_project(id)) with check (private.can_manage_project(id));

create policy "project members read project members" on public.project_members for select to authenticated using (private.can_read_project(project_id));
create policy "project members manage by admin or lead" on public.project_members for all to authenticated using (private.can_manage_project(project_id)) with check (private.can_manage_project(project_id));

create policy "tasks read project members" on public.tasks for select to authenticated using (private.can_read_project(project_id));
create policy "tasks insert by project managers" on public.tasks for insert to authenticated with check (private.can_manage_project(project_id));
create policy "tasks update by owner or project managers" on public.tasks for update to authenticated using (owner_user_id = auth.uid() or private.can_manage_project(project_id)) with check (owner_user_id = auth.uid() or private.can_manage_project(project_id));

create policy "task comments read task readers" on public.task_comments for select to authenticated using (private.can_read_task(task_id));
create policy "task comments insert task readers" on public.task_comments for insert to authenticated with check (private.can_read_task(task_id));
create policy "task comments update author or manager" on public.task_comments for update to authenticated using (author_user_id = auth.uid() or private.is_admin()) with check (author_user_id = auth.uid() or private.is_admin());

create policy "task dependencies read task readers" on public.task_dependencies for select to authenticated using (private.can_read_task(task_id) and private.can_read_task(depends_on_task_id));
create policy "task dependencies manage project managers" on public.task_dependencies for all to authenticated using (private.can_read_task(task_id)) with check (private.can_read_task(task_id));

create policy "meetings read project members" on public.meetings for select to authenticated using (project_id is null or private.can_read_project(project_id));
create policy "meetings insert project managers" on public.meetings for insert to authenticated with check (project_id is null or private.can_manage_project(project_id));
create policy "meetings update project managers" on public.meetings for update to authenticated using (project_id is null or private.can_manage_project(project_id)) with check (project_id is null or private.can_manage_project(project_id));

create policy "meeting attendees read meeting readers" on public.meeting_attendees for select to authenticated using (private.can_read_meeting(meeting_id));
create policy "meeting attendees manage meeting readers" on public.meeting_attendees for all to authenticated using (private.can_read_meeting(meeting_id)) with check (private.can_read_meeting(meeting_id));

create policy "meeting decisions read meeting readers" on public.meeting_decisions for select to authenticated using (private.can_read_meeting(meeting_id));
create policy "meeting decisions manage meeting readers" on public.meeting_decisions for all to authenticated using (private.can_read_meeting(meeting_id)) with check (private.can_read_meeting(meeting_id));

create policy "action items read project members" on public.action_items for select to authenticated using (project_id is null or private.can_read_project(project_id));
create policy "action items insert project managers" on public.action_items for insert to authenticated with check (project_id is null or private.can_manage_project(project_id));
create policy "action items update owner or managers" on public.action_items for update to authenticated using (owner_user_id = auth.uid() or project_id is null or private.can_manage_project(project_id)) with check (owner_user_id = auth.uid() or project_id is null or private.can_manage_project(project_id));

create policy "requirements read project members" on public.requirements for select to authenticated using (project_id is null or private.can_read_project(project_id));
create policy "requirements insert project managers" on public.requirements for insert to authenticated with check (project_id is null or private.can_manage_project(project_id));
create policy "requirements update project managers" on public.requirements for update to authenticated using (project_id is null or private.can_manage_project(project_id)) with check (project_id is null or private.can_manage_project(project_id));

create policy "requirement versions read requirement readers" on public.requirement_versions for select to authenticated using (private.can_read_requirement(requirement_id));
create policy "requirement versions insert requirement readers" on public.requirement_versions for insert to authenticated with check (private.can_read_requirement(requirement_id));

create policy "files read signed in" on public.files for select to authenticated using (true);
create policy "files insert signed in" on public.files for insert to authenticated with check (created_by = auth.uid() or created_by is null);
create policy "files update creator or admin" on public.files for update to authenticated using (created_by = auth.uid() or private.is_admin()) with check (created_by = auth.uid() or private.is_admin());

create policy "entity files read signed in" on public.entity_files for select to authenticated using (true);
create policy "entity files insert signed in" on public.entity_files for insert to authenticated with check (true);
create policy "entity files delete admin" on public.entity_files for delete to authenticated using (private.is_admin());

create policy "notifications read own or admin" on public.notifications for select to authenticated using (recipient_user_id = auth.uid() or private.is_admin());
create policy "notifications admin write" on public.notifications for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "notification preferences read own or admin" on public.notification_preferences for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy "notification preferences manage own or admin" on public.notification_preferences for all to authenticated using (user_id = auth.uid() or private.is_admin()) with check (user_id = auth.uid() or private.is_admin());

create policy "activity logs read project members" on public.activity_logs for select to authenticated using (project_id is null or private.can_read_project(project_id));
create policy "activity logs insert admin" on public.activity_logs for insert to authenticated with check (private.is_admin());

create policy "integration accounts admin only" on public.integration_accounts for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy "google calendar events read project members" on public.google_calendar_events for select to authenticated using (project_id is null or private.can_read_project(project_id));
create policy "google calendar events admin write" on public.google_calendar_events for all to authenticated using (private.is_admin()) with check (private.is_admin());

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
grant usage on all sequences in schema public to authenticated;

grant select, insert on public.profiles to authenticated;
grant update (email, display_name, avatar_url, updated_at) on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant select, insert, update on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update on public.task_comments to authenticated;
grant select, insert, update, delete on public.task_dependencies to authenticated;
grant select, insert, update on public.meetings to authenticated;
grant select, insert, update, delete on public.meeting_attendees to authenticated;
grant select, insert, update, delete on public.meeting_decisions to authenticated;
grant select, insert, update on public.action_items to authenticated;
grant select, insert, update on public.requirements to authenticated;
grant select, insert on public.requirement_versions to authenticated;
grant select, insert, update on public.files to authenticated;
grant select, insert, delete on public.entity_files to authenticated;
grant select on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, insert, update on public.integration_accounts to authenticated;
grant select, insert, update on public.google_calendar_events to authenticated;
