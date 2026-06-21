-- ============================================================
-- 依據 2026-06-20 AI委員會第四次技術會議紀錄更新專案預計完成時間
-- 執行方式：貼到 Supabase SQL Editor -> Run
-- ============================================================

with project_due_dates as (
  select *
  from (
    values
      ('ai-workshop', '2026-07-26'::date),
      ('ai-video-workshop', '2026-12-31'::date),
      ('ai-club-administration-system', '2026-09-30'::date),
      ('rotary-ai-platform', '2026-07-03'::date),
      ('rotary-3481-chatbot', '2026-07-03'::date),
      ('rotary-passport-2', '2026-12-31'::date),
      ('cloud-account-access-management', '2026-07-31'::date)
  ) as rows(slug, expected_end_date)
)
update public.projects as projects
set expected_end_date = project_due_dates.expected_end_date
from project_due_dates
where projects.slug = project_due_dates.slug;
