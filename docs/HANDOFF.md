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
- Fixed the initial migration by renaming the `notifications.window` column to `notifications.reminder_window`.
- Initialized Git and pushed the first project foundation to GitHub.

## Current Project State

- Local repo: `/Users/yikaihuang/Desktop/Codex/rotary-ai-platform`
- GitHub repo: `https://github.com/yhwang0928/rotary-ai-platform.git`
- Supabase project URL: `https://ffbaaqrvlcrxfdxyfdzs.supabase.co`
- Local dev URL: `http://localhost:5173/`
- Supabase migration and seed were applied manually through Supabase SQL Editor.
- `.env.local`, `node_modules`, and `dist` are intentionally ignored and not pushed to GitHub.

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
- RLS should be tested with real users for each role before broader feature work.
- Google Calendar/Meet OAuth, email reminders, and Cloudflare production deployment still need separate implementation and verification.
- The first admin user still needs to be created in Supabase Auth and assigned `profiles.role = 'admin'`.
- Project membership still needs to be assigned before non-admin users can see project data.

## Verification Completed

- `pnpm install`
- `pnpm lint`
- `pnpm build`
- `pnpm dev` at `http://localhost:5173/`
- Initial GitHub push to `origin/main`

## Next Recommended Step

Create the first Supabase Auth user, set that user's `profiles.role` to `admin`, then log in at `http://localhost:5173/` to verify that the seven seeded projects load from Supabase.
