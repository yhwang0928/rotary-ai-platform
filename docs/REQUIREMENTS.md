# Rotary AI Platform Requirements

Last updated: 2026-06-19

## 1. Product Goal

Build an internal project management platform for Rotary District 3481 AI committee work. The platform centralizes project tasks, meeting records, action items, development requirements, Google Drive references, Google Meet scheduling links, Gantt progress views, and due-date reminders.

The platform should replace scattered manual tracking in Excel/Google Drive with a structured online system while preserving Google Drive as the canonical file repository for documents, slides, media, and meeting attachments.

## 2. Operating Principles

- Supabase is the source of truth for structured records: projects, tasks, meetings, requirements, members, reminders, and audit logs.
- Google Drive remains the source of truth for document files and large attachments.
- Google Calendar/Meet is the source of truth for scheduled online meetings.
- Cloudflare hosts and protects the web application at the edge.
- Codex and Claude must work from this requirements folder and update docs before major implementation changes.
- Every meeting decision that creates work must become a tracked task or action item.
- Every task must have an owner, status, due date, and related project.

## 3. Target Users

| Role | Description | Primary Needs |
| --- | --- | --- |
| Platform Admin | Maintains users, permissions, system settings | Manage access, audit changes, configure integrations |
| Project Lead | Oversees one or more project groups | Review progress, assign tasks, track risk |
| Task Owner | Responsible for deliverables | Update task status, upload outputs, receive reminders |
| Committee Member | Participates in meetings and projects | View records, search decisions, follow assigned work |
| External Viewer | Optional read-only stakeholder | View selected project status and meeting summaries |

## 4. Core Modules

### 4.1 Dashboard

Purpose: Provide a single project status overview.

Required features:
- Overall task counts by status.
- Overdue task count.
- Tasks due within 3, 7, and 14 days.
- Project progress by work group.
- Recent meeting decisions.
- Recently updated requirements.
- Quick links to Google Drive folders and active Google Meet rooms.

MVP acceptance:
- User can filter by project group, owner, status, and due window.
- Dashboard reflects latest task and meeting updates from Supabase.

### 4.2 Project And Work Group Management

Initial work groups:
- AI Workshop
- AI Club Administration System
- Rotary 3481 Chatbot
- AI Video Workshop
- Rotary Passport 2.0
- Rotary AI Platform
- Cloud Account And Access Management

Required features:
- Create and edit projects/work groups.
- Assign project lead and members.
- Link each project to its Google Drive folder.
- Show related tasks, meetings, requirements, and files.

### 4.3 Task Tracking

Required features:
- Create, edit, archive, and search tasks.
- Convert meeting action items into tasks.
- Status workflow: `backlog`, `todo`, `doing`, `review`, `done`, `blocked`, `cancelled`.
- Priority: `p0`, `p1`, `p2`, `p3`.
- Fields: title, description, owner, collaborators, start date, due date, completed date, output link, blocker reason.
- Support comments and change history.

MVP acceptance:
- User can edit tasks inline from table view.
- User can filter by owner, status, project, priority, and due date.
- Task updates write an audit log entry.

### 4.4 Gantt View

Required features:
- Display tasks by project and date range.
- Dragging/resizing bars may be deferred; MVP can use form-based editing.
- Highlight overdue and blocked tasks.
- Show dependencies when defined.
- Toggle views: week, month, quarter.

MVP acceptance:
- Gantt chart is generated from `start_date`, `due_date`, `status`, and `project_id`.
- Clicking a bar opens the task detail drawer.

### 4.5 Meeting Records

Required features:
- Create meeting records with date, title, attendees, agenda, decisions, notes, and attachments.
- Search historical meeting records.
- Link meeting records to projects, tasks, requirements, and Google Drive documents.
- Convert decisions or action items into tasks.
- Store Google Calendar event ID and Google Meet URL when the meeting is scheduled from the platform.

MVP acceptance:
- User can create a meeting record manually.
- User can add decision items and action items.
- Action items can be promoted into tasks.
- User can search by keyword, project, attendee, and date.

### 4.6 Google Meet And Calendar Integration

Required features:
- Create a Google Calendar event from the platform.
- Generate or attach a Google Meet link to the event.
- Store `google_calendar_event_id`, `google_meet_url`, event start/end time, and organizer.
- Attach meeting notes or Drive files to the event when available.

Implementation boundary:
- Google OAuth must be handled server-side.
- Store OAuth refresh tokens encrypted or use a trusted Google Workspace service account flow if available.
- Do not expose Google API secrets in frontend code.

MVP acceptance:
- Authorized user can create a meeting with title, time, attendees, and project.
- The platform stores and displays the returned Meet URL.

### 4.7 Requirements Management

Required features:
- Track product requirements separately from tasks.
- Requirement lifecycle: `draft`, `reviewing`, `approved`, `in_dev`, `testing`, `released`, `rejected`.
- Fields: module, user role, user story, acceptance criteria, priority, owner, related tasks, related files.
- Support comments and version notes.

Initial modules:
- Authentication and permissions
- Dashboard
- Task tracking
- Meeting records
- Gantt chart
- Notifications
- Google Drive integration
- Google Calendar/Meet integration
- Audit logs
- Admin settings

### 4.8 File And Google Drive Index

Required features:
- Store Google Drive file/folder references in Supabase.
- Link files to projects, meetings, tasks, and requirements.
- Display file title, type, owner if available, last synced time, and Drive URL.
- Do not duplicate full Drive file content into Supabase unless needed for search indexing.

MVP acceptance:
- User can paste a Drive URL and classify it.
- Platform can show related files on project/task/meeting detail pages.

### 4.9 Notifications And Reminders

Required features:
- Daily reminder job for overdue and soon-due tasks.
- Reminder windows: due today, due in 3 days, due in 7 days, overdue.
- Notify task owner and optionally project lead.
- Supported channels by phase:
  - MVP: email
  - Phase 2: LINE Notify or Messaging API, Slack, Google Chat
- Store notification delivery history.

MVP acceptance:
- Scheduled job finds qualifying tasks and writes notification records.
- Email reminders are sent once per task per reminder window.

### 4.10 Activity Logs

Required features:
- Track create, update, delete/archive, status change, assignment change, due date change, and integration events.
- Log actor, entity type, entity ID, previous value, new value, timestamp.

MVP acceptance:
- Task, meeting, and requirement changes are visible in an activity history panel.

## 5. Suggested Technical Architecture

### 5.1 Frontend

Recommended:
- React or Next.js with TypeScript.
- Cloudflare Pages for hosting.
- If server rendering is required, use Cloudflare Pages Functions or Workers carefully and keep Supabase as the main backend.

Frontend responsibilities:
- Auth UI.
- Dashboard, tables, detail drawers, Gantt chart, meeting editor.
- Call Supabase client for authorized data access.
- Call server-side endpoints for Google OAuth and Calendar/Meet operations.

### 5.2 Backend

Recommended:
- Supabase Postgres for data.
- Supabase Auth for login and authorization.
- Supabase Row Level Security for project/member access.
- Supabase Edge Functions for Google Calendar/Meet integration, reminders, and webhook handling.
- Supabase Cron for scheduled reminder execution.

Backend responsibilities:
- Enforce role-based access.
- Store structured data and audit logs.
- Run scheduled reminder jobs.
- Proxy Google API calls server-side.

### 5.3 Cloudflare

Recommended:
- Cloudflare Pages: frontend hosting and preview deployments.
- Cloudflare Workers: optional lightweight API gateway, webhook receiver, or edge proxy.
- Cloudflare Access: optional additional protection for internal admin routes.
- Cloudflare Turnstile: optional bot protection on public forms.
- Cloudflare R2: optional object storage only if files are not staying in Google Drive.

Cloudflare should not replace Supabase for core relational data in this project.

## 6. Initial Data Model

### 6.1 Main Tables

```text
profiles
organizations
projects
project_members
tasks
task_comments
task_dependencies
meetings
meeting_attendees
meeting_decisions
action_items
requirements
requirement_versions
files
entity_files
notifications
notification_preferences
activity_logs
integration_accounts
google_calendar_events
```

### 6.2 Key Table Sketch

```sql
projects (
  id uuid primary key,
  name text not null,
  slug text unique not null,
  description text,
  status text not null,
  lead_user_id uuid,
  google_drive_folder_url text,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

tasks (
  id uuid primary key,
  project_id uuid not null references projects(id),
  title text not null,
  description text,
  status text not null,
  priority text not null,
  owner_user_id uuid,
  start_date date,
  due_date date,
  completed_at timestamptz,
  blocker_reason text,
  output_url text,
  created_by uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  archived_at timestamptz
)

meetings (
  id uuid primary key,
  project_id uuid references projects(id),
  title text not null,
  meeting_date date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  summary text,
  google_calendar_event_id text,
  google_meet_url text,
  notes_doc_url text,
  created_by uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

requirements (
  id uuid primary key,
  project_id uuid references projects(id),
  module text not null,
  title text not null,
  user_role text,
  user_story text,
  acceptance_criteria text,
  status text not null,
  priority text not null,
  owner_user_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

## 7. Permissions

Initial roles:
- `admin`: full platform access.
- `project_lead`: manage assigned projects, tasks, meetings, requirements.
- `member`: view assigned projects, update assigned tasks, create meeting notes.
- `viewer`: read-only access to assigned projects.

RLS rules:
- Users can read projects where they are members.
- Project leads can manage records inside their projects.
- Task owners can update limited task fields for their assigned tasks.
- Admins can manage all records.
- No table in the public schema should be exposed without RLS.

## 8. AI Development Workflow

### 8.1 Codex Responsibilities

Use Codex for:
- Repository setup.
- Supabase schema and migration design.
- TypeScript/React implementation.
- Refactoring, testing, and verification.
- Pull request review and bug fixing.
- Local tooling, scripts, and deployment config.

### 8.2 Claude Responsibilities

Use Claude for:
- Product writing and requirement refinement.
- UX flow drafting.
- Long-form meeting summaries.
- Acceptance criteria review.
- Edge-case brainstorming.
- User-facing copy drafts.

### 8.3 Shared Rules For AI Agents

- Read `docs/REQUIREMENTS.md` before major changes.
- Do not change database schema without updating the data model section or adding a migration note.
- Do not introduce a new service without documenting why it is needed.
- Keep Google secrets, Supabase service role keys, and Cloudflare API tokens out of frontend code.
- Every feature branch should include a short handoff note: what changed, how to verify, open risks.

## 9. MVP Scope

MVP should include:
- Supabase Auth login.
- Project list and project detail.
- Task table with filtering and editing.
- Gantt chart generated from tasks.
- Meeting record create/search/detail.
- Action item to task conversion.
- Google Calendar/Meet event creation.
- Email reminders for due/overdue tasks.
- Basic activity log.
- Cloudflare Pages deployment.

MVP should exclude:
- Full Google Drive bidirectional sync.
- AI meeting transcription.
- Complex dependency scheduling.
- Mobile app.
- Advanced analytics.
- Public external portal.

## 10. Implementation Milestones

### Milestone 0: Project Foundation

- Create repository structure.
- Configure frontend stack.
- Configure Supabase local/remote project.
- Configure Cloudflare Pages deployment.
- Add `.env.example`.
- Add coding and AI collaboration docs.

### Milestone 1: Database And Auth

- Create core tables.
- Enable RLS.
- Implement role model.
- Seed initial projects from current Rotary AI committee work groups.
- Implement login and session handling.

### Milestone 2: Task Management

- Build task table.
- Build task detail drawer.
- Add filters and status changes.
- Add audit logs.

### Milestone 3: Meetings

- Build meeting list and editor.
- Add decisions and action items.
- Convert action items into tasks.
- Link files and notes.

### Milestone 4: Gantt And Dashboard

- Build dashboard cards.
- Build Gantt view.
- Add project and owner filters.

### Milestone 5: Integrations And Reminders

- Add Google OAuth.
- Add Calendar/Meet event creation.
- Add scheduled reminder function.
- Add email delivery.

### Milestone 6: Pilot And Data Migration

- Convert existing WBS Excel into structured task records.
- Import meeting summaries from existing sheets/docs.
- Run pilot with 3 to 5 committee users.
- Fix UX and permission issues before broader rollout.

## 11. Open Decisions

- Which Google Workspace account owns created meetings?
- Should meeting notes be stored primarily in Supabase rich text or Google Docs?
- Which email provider should be used for reminders?
- Is LINE notification required for Taiwanese committee members in MVP?
- Who are the first admin and project lead users?
- Should Cloudflare Access be required in addition to Supabase Auth?

## 12. Current Recommendation

Use Supabase as the main application backend and Cloudflare as the hosting/protection layer. Do not migrate all Google Drive files into Supabase. Instead, migrate the WBS and meeting metadata into Supabase, keep source files in Drive, and link every record across the platform.
