-- This migration was applied before Supabase migration history was aligned.
-- Keep it as a no-op so the transferred project records the version without
-- re-creating existing policies/triggers.
select 1;
