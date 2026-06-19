# Claude Handoff Context

Use this project context when working on Rotary AI Platform requirements, UX, or implementation review.

## Product Summary

The platform manages Rotary District 3481 AI committee projects, including task tracking, meeting records, Google Meet scheduling, Gantt progress views, requirements, Google Drive references, and due-date reminders.

## Source Of Truth

- Structured data: Supabase Postgres.
- Files and attachments: Google Drive.
- Meetings and Meet links: Google Calendar/Google Meet.
- Hosting and edge protection: Cloudflare.
- Requirements baseline: `docs/REQUIREMENTS.md`.

## Claude Focus Areas

- Refine user stories and acceptance criteria.
- Improve meeting record templates.
- Review whether feature scope is MVP or Phase 2.
- Identify missing operational or permission edge cases.
- Produce concise handoff notes for Codex.

## Guardrails

- Do not suggest putting Supabase service-role keys, Google OAuth secrets, or Cloudflare tokens in frontend code.
- Do not introduce a new tool unless it clearly replaces or complements Supabase, Google Workspace, or Cloudflare.
- Keep project management workflows simple enough for non-engineering Rotary committee members.
