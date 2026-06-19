# AI Agent Instructions

This folder contains planning and implementation material for the Rotary AI Platform.

## Required Reading

Before implementing or modifying the app, read:

1. `docs/REQUIREMENTS.md`
2. Any migration files or schema notes once they exist
3. The current handoff note if one exists

## Collaboration Rules

- Keep requirements, schema, and implementation aligned.
- Prefer small, verifiable changes.
- Do not expose secrets in client code.
- Use Supabase RLS for data authorization.
- Use Cloudflare for deployment/protection, not as the primary relational database.
- Keep Google Drive as the document repository unless a specific requirement says otherwise.
- Update this folder's docs when architecture decisions change.

## Suggested Agent Split

- Codex: code implementation, migrations, tests, verification, deployment config.
- Claude: requirement refinement, UX copy, meeting-summary templates, acceptance criteria review.

## Verification Expectations

Each implementation handoff should state:

- What changed
- How to run or verify it
- Which user roles were considered
- Which data tables or integrations were touched
- Remaining risks or follow-up tasks
