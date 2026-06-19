# Handoff Notes

Last updated: 2026-06-19

## What Changed

- Created the Vite + React + TypeScript frontend foundation.
- Added Supabase client setup using public Vite environment variables.
- Added a login screen and first dashboard view for projects, tasks, meetings, and requirements.
- Added Cloudflare Pages config via `wrangler.toml`.
- Added initial Supabase schema migration covering core MVP tables.
- Enabled RLS on every public table in the migration.
- Added private helper functions for project membership and role checks.
- Added task update audit trigger writing to `activity_logs`.
- Added seed SQL for the seven initial Rotary AI work groups.

## How To Verify

1. Install dependencies with `pnpm install`.
2. Configure `.env.local` from `.env.example`.
3. Apply `supabase/migrations/202606190001_initial_foundation.sql`.
4. Apply `supabase/seed/initial_projects.sql`.
5. Create at least one Supabase Auth user.
6. Assign that user a profile role and project membership through SQL.
7. Run `pnpm lint`.
8. Run `pnpm build`.
9. Run `pnpm dev` and log in.

## Roles Considered

- `admin`: can manage all records through RLS helper checks.
- `project_lead`: can manage assigned project records when their `project_members.role` is `lead`.
- `member`: can read assigned projects and update owned tasks/action items.
- `viewer`: can read assigned project records.

## Data Tables Touched

`profiles`, `organizations`, `projects`, `project_members`, `tasks`, `task_comments`, `task_dependencies`, `meetings`, `meeting_attendees`, `meeting_decisions`, `action_items`, `requirements`, `requirement_versions`, `files`, `entity_files`, `notifications`, `notification_preferences`, `activity_logs`, `integration_accounts`, and `google_calendar_events`.

## Integrations Touched

- Supabase Auth/Postgres/RLS foundation only.
- Google Drive, Google Calendar/Meet, and email delivery are not implemented yet.

## Remaining Risks

- Supabase CLI is not installed in this environment, so the migration was created manually instead of through `supabase migration new`.
- The migration has not been applied to a live Supabase project in this session.
- RLS should be tested with real users for each role before broader feature work.
- Google Calendar/Meet OAuth, email reminders, and Cloudflare production deployment still need separate implementation and verification.

## Verification Completed

- `pnpm install`
- `pnpm lint`
- `pnpm build`
- `pnpm dev` at `http://localhost:5173/`
