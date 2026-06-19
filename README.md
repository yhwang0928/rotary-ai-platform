# Rotary AI Platform

Internal project management platform for Rotary District 3481 AI committee work.

## Stack

- Vite + React + TypeScript
- Supabase Auth, Postgres, RLS
- Cloudflare Pages

## Local Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

4. Apply Supabase SQL in order:

   ```text
   supabase/migrations/202606190001_initial_foundation.sql
   supabase/seed/initial_projects.sql
   ```

5. Start the app:

   ```bash
   pnpm dev
   ```

## Current Scope

This foundation includes the React app shell, Supabase client, login flow, dashboard read model, core schema, RLS policies, task audit trigger, and initial Rotary AI work groups.

Google Calendar/Meet, email reminders, task inline editing, Gantt, and Drive indexing are planned next milestones.
