-- ============================================================
-- 清理公告欄重複公告。
-- 執行方式：貼到 Supabase SQL Editor -> Run
-- ============================================================

with ranked as (
  select
    id,
    row_number() over (
      partition by title, coalesce(body, '')
      order by created_at desc, id desc
    ) as row_number
  from public.announcements
)
delete from public.announcements
using ranked
where public.announcements.id = ranked.id
  and ranked.row_number > 1;

delete from public.announcements old_item
where old_item.title = '⚠️ 下次AI委員會工作會議 — 主議題預告'
  and exists (
    select 1
    from public.announcements new_item
    where new_item.title = '下次AI委員會工作會議：主議題預告'
  );
