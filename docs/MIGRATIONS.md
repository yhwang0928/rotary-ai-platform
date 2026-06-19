# Migration Notes

## 202606190001_initial_foundation.sql

Purpose: Milestone 1 foundation for database, Auth profile bootstrap, project membership authorization, and MVP table coverage.

Includes:

- Core enum types for roles, project status, task status, priorities, requirement lifecycle, file kinds, entities, and notifications.
- Core public tables listed in `docs/REQUIREMENTS.md`.
- `private` schema helper functions for authorization.
- RLS enabled on every public table.
- Auth user bootstrap trigger that inserts `profiles` and `notification_preferences`.
- Task update audit trigger writing to `activity_logs`.
- Authenticated role grants for Data API access, scoped by RLS.

Important implementation notes:

- Authorization uses `profiles.role` and `project_members.role`; it does not rely on user-editable Auth metadata.
- Security definer helper functions live in the private schema, not the exposed public schema.
- New Supabase projects may not expose SQL-created tables to the Data API automatically. The migration grants authenticated table access, while RLS remains the row-level gate.
- Service-role keys and Google secrets must stay server-side only.
