-- ============================================================
-- 依據 2026-06-20 AI委員會會議記錄更新專案資料、任務、公告與行事曆
-- 執行方式：貼到 Supabase SQL Editor -> Run
-- ============================================================

insert into public.organizations (name, slug)
values ('國際扶輪 3481 地區 AI 委員會', 'rotary-3481-ai')
on conflict (slug) do update
set name = excluded.name;

-- 1. 依 6/20 會議記錄名稱更新專案列表。
with org as (
  select id from public.organizations where slug = 'rotary-3481-ai'
),
seed_projects as (
  select *
  from (
    values
      ('ai-workshop', 'AI工作坊', '舉辦AI工作坊提升地區扶輪社友AI應用能力。第一場邀請各社社長、秘書及AI委員（每社限3人），第二場開放全體社友，職密會員優先。全程錄影，錄檔僅供主辦方存檔。', 'Candice', 'PT、Vivian、Kent', '2026-06-20'::date, '2026-07-26'::date),
      ('ai-video-workshop', 'AI影音工作坊', '製作AI影音內容，呈現扶輪地區年度發展方向與AI委員會核心精神；每月1-2支短影音，呈現各社特色或配合扶輪月主題。Jack負責訓練專屬扶輪影片AI模型。', 'Jake', 'PT、Vivian、Prevers（公關委員會）', '2026-06-20'::date, '2026-12-31'::date),
      ('ai-club-administration-system', 'AI社務系統上雲部署', '將現有HTML版社務系統進行打包、雲端部署、安全與權限確認，採MVP分階段上線策略，先與IDG Computer對接功能細節。', 'Vivian', 'Eric、IDG Computer', '2026-06-20'::date, '2026-09-30'::date),
      ('rotary-ai-platform', 'AI平台MVP', '彙整AI委員會六項工作進度，提供專案、任務、會議紀錄、公告與行事曆管理，於7月3日展示MVP。', 'Jim', 'AI相關負責人、APPS團隊', '2026-06-20'::date, '2026-07-03'::date),
      ('rotary-3481-chatbot', '扶輪ChatBot', '建置扶輪ChatBot，初期運用CP AI主機資源，預定7月3日釋出第一版MVP。Vivian彙整總會文獻，IDG Computer提供地區網站歷年數位資料作為知識庫。', 'Jim', 'CP AI、Gayvin', '2026-06-20'::date, '2026-07-03'::date),
      ('rotary-passport-2', 'Rotary Passport 2.0', '開發Rotary Passport 2.0，採分階段導入方式，先與IDG Computer進行系統功能對接與盤點，向總監確認項目進展。', 'Wesley', 'PT、Vivian、Candice、IDG Computer', '2026-06-20'::date, '2026-12-31'::date),
      ('cloud-account-access-management', '職業分類與會員資料收集', '收集會員職業分類資料。第一階段收集公開、低敏感資料；電話、Email等個資待第二階段確認授權後處理。', 'Wesley', '', '2026-07-01'::date, '2026-07-31'::date)
  ) as rows(slug, name, project_purpose, owner_names, participating_units, start_date, expected_end_date)
)
insert into public.projects (
  organization_id,
  slug,
  name,
  description,
  status,
  project_purpose,
  owner_names,
  participating_units,
  start_date,
  expected_end_date
)
select
  org.id,
  seed_projects.slug,
  seed_projects.name,
  seed_projects.project_purpose,
  'active',
  seed_projects.project_purpose,
  seed_projects.owner_names,
  nullif(seed_projects.participating_units, ''),
  seed_projects.start_date,
  seed_projects.expected_end_date
from org
cross join seed_projects
on conflict (slug) do update
set
  organization_id = excluded.organization_id,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  project_purpose = excluded.project_purpose,
  owner_names = excluded.owner_names,
  participating_units = excluded.participating_units,
  start_date = excluded.start_date,
  expected_end_date = excluded.expected_end_date;

-- 2. 同步所有代辦與預計完成事項到 tasks。
with seed_tasks as (
  select *
  from (
    values
      ('ai-workshop', '設計工作坊報名表', 'todo', 'p1', 'Candice', null, '2026-06-28'::date, null),
      ('ai-workshop', '與總監溝通工作坊時間確認', 'todo', 'p1', 'Vivian', null, '2026-06-28'::date, null),
      ('ai-workshop', '確認工作坊場地與時間可行性', 'todo', 'p1', 'Vivian', null, '2026-06-28'::date, null),
      ('ai-workshop', '7月1日統一發布報名公告', 'todo', 'p1', 'Candice', null, '2026-07-01'::date, null),
      ('ai-workshop', '監控各項執行進度、確保7月3日Demo版本', 'todo', 'p1', 'Candice', null, '2026-07-03'::date, null),
      ('ai-workshop', '7月18日社秘會議現場宣導', 'todo', 'p2', 'Candice', null, '2026-07-18'::date, null),
      ('ai-workshop', '舉辦第一場AI工作坊（社長、秘書、AI委員）', 'todo', 'p0', 'Candice', null, '2026-07-26'::date, '第一場AI工作坊'),

      ('ai-video-workshop', '製作並發布首支宣傳影片（地區年度方向 + AI委員會精神）', 'todo', 'p0', 'Jake', 'PT、Vivian', '2026-07-01'::date, '首支宣傳影片'),
      ('ai-video-workshop', '7月18日社秘會播放宣傳影片', 'todo', 'p1', 'Jake', null, '2026-07-18'::date, null),
      ('ai-video-workshop', '公關委員會協助蒐集資訊與初審', 'todo', 'p2', 'Prevers', null, '2026-07-31'::date, null),
      ('ai-video-workshop', '訓練專屬扶輪影片AI模型', 'todo', 'p1', 'Jake', null, '2026-09-30'::date, '專屬扶輪影片AI模型'),
      ('ai-video-workshop', '每月產出1-2支短影音（各社特色 / 扶輪月主題）', 'doing', 'p2', 'Jake', 'PT、Vivian', '2026-12-31'::date, '每月1-2支短影音'),

      ('ai-club-administration-system', '與IDG Computer對接系統功能細節', 'todo', 'p0', 'Vivian', 'IDG Computer', '2026-06-28'::date, null),
      ('ai-club-administration-system', '評估MVP分階段上線可行性', 'todo', 'p0', 'Vivian', 'Eric', '2026-06-28'::date, null),
      ('ai-club-administration-system', '完成打包與雲端部署', 'todo', 'p1', 'Vivian', 'Eric', '2026-09-30'::date, 'AI社務系統上雲部署'),
      ('ai-club-administration-system', '安全與權限確認', 'todo', 'p1', 'Vivian', 'Eric', '2026-09-30'::date, '安全與權限確認'),

      ('rotary-ai-platform', 'AI平台MVP展示', 'todo', 'p0', 'Jim', 'AI相關負責人、APPS團隊', '2026-07-03'::date, 'AI平台MVP'),

      ('rotary-3481-chatbot', '與CP AI/Gayvin約時間討論MVP後端規格', 'todo', 'p0', 'Jim', 'CP AI、Gayvin', '2026-06-27'::date, null),
      ('rotary-3481-chatbot', '釋出第一版MVP', 'todo', 'p0', 'Jim', 'CP AI', '2026-07-03'::date, '扶輪ChatBot MVP'),
      ('rotary-3481-chatbot', '彙整國際扶輪總會文獻作為知識庫', 'todo', 'p1', 'Vivian', null, '2026-07-20'::date, null),
      ('rotary-3481-chatbot', 'IDG Computer提供地區網站歷年數位資料', 'todo', 'p1', 'IDG Computer', null, '2026-07-20'::date, null),

      ('rotary-passport-2', '向總監確認2.0項目進展', 'todo', 'p0', 'Wesley', null, '2026-06-28'::date, null),
      ('rotary-passport-2', '與IDG Computer召開系統功能對接與盤點會議', 'todo', 'p0', 'Wesley', 'Vivian、IDG Computer', '2026-06-28'::date, null),
      ('rotary-passport-2', '確認分階段導入計畫', 'todo', 'p1', 'Wesley', 'Vivian、Candice', '2026-07-31'::date, '分階段導入計畫'),

      ('cloud-account-access-management', '開始收集第一批公開、低敏感職業分類資料', 'todo', 'p1', 'Wesley', null, '2026-07-31'::date, '第一批職業分類資料'),
      ('cloud-account-access-management', '確認第二階段個資授權流程（電話、Email）', 'backlog', 'p2', 'Wesley', null, null::date, '第二階段個資授權流程')
  ) as rows(project_slug, title, status, priority, owner_names, collaborator_names, due_date, output_title)
),
resolved_tasks as (
  select
    projects.id as project_id,
    seed_tasks.title,
    seed_tasks.status,
    seed_tasks.priority,
    seed_tasks.owner_names,
    seed_tasks.collaborator_names,
    seed_tasks.due_date,
    seed_tasks.output_title
  from seed_tasks
  join public.projects on projects.slug = seed_tasks.project_slug
)
insert into public.tasks (
  project_id,
  title,
  status,
  priority,
  owner_names,
  collaborator_names,
  due_date,
  output_title
)
select
  project_id,
  title,
  status::task_status,
  priority::task_priority,
  owner_names,
  collaborator_names,
  due_date,
  output_title
from resolved_tasks
where not exists (
  select 1
  from public.tasks existing
  where existing.project_id = resolved_tasks.project_id
    and existing.title = resolved_tasks.title
);

-- 3. 同步所有有日期的代辦與預計完成事項到手動行事曆事件。
with dated_task_events as (
  select
    tasks.project_id,
    tasks.title,
    tasks.due_date as event_date,
    concat_ws(E'\n',
      '來源：2026-06-20 AI委員會會議記錄',
      '類型：代辦/預計完成事項',
      '負責人：' || nullif(tasks.owner_names, ''),
      '協作者：' || nullif(tasks.collaborator_names, ''),
      '產出：' || nullif(tasks.output_title, '')
    ) as description
  from public.tasks
  join public.projects on projects.id = tasks.project_id
  where projects.slug in (
    'ai-workshop',
    'ai-video-workshop',
    'ai-club-administration-system',
    'rotary-ai-platform',
    'rotary-3481-chatbot',
    'rotary-passport-2',
    'cloud-account-access-management'
  )
    and tasks.due_date is not null
    and tasks.title in (
      '設計工作坊報名表',
      '與總監溝通工作坊時間確認',
      '確認工作坊場地與時間可行性',
      '7月1日統一發布報名公告',
      '監控各項執行進度、確保7月3日Demo版本',
      '7月18日社秘會議現場宣導',
      '舉辦第一場AI工作坊（社長、秘書、AI委員）',
      '製作並發布首支宣傳影片（地區年度方向 + AI委員會精神）',
      '7月18日社秘會播放宣傳影片',
      '公關委員會協助蒐集資訊與初審',
      '訓練專屬扶輪影片AI模型',
      '每月產出1-2支短影音（各社特色 / 扶輪月主題）',
      '與IDG Computer對接系統功能細節',
      '評估MVP分階段上線可行性',
      '完成打包與雲端部署',
      '安全與權限確認',
      'AI平台MVP展示',
      '與CP AI/Gayvin約時間討論MVP後端規格',
      '釋出第一版MVP',
      '彙整國際扶輪總會文獻作為知識庫',
      'IDG Computer提供地區網站歷年數位資料',
      '向總監確認2.0項目進展',
      '與IDG Computer召開系統功能對接與盤點會議',
      '確認分階段導入計畫',
      '開始收集第一批公開、低敏感職業分類資料'
    )
),
project_milestones as (
  select
    id as project_id,
    name || ' 預計完成' as title,
    expected_end_date as event_date,
    '來源：2026-06-20 AI委員會會議記錄' as description
  from public.projects
  where slug in (
    'ai-workshop',
    'ai-video-workshop',
    'ai-club-administration-system',
    'rotary-ai-platform',
    'rotary-3481-chatbot',
    'rotary-passport-2',
    'cloud-account-access-management'
  )
    and expected_end_date is not null
),
seed_calendar_events as (
  select * from dated_task_events
  union all
  select * from project_milestones
)
insert into public.calendar_events (project_id, title, event_date, description, location)
select
  project_id,
  title,
  event_date,
  description,
  'AI委員會' as location
from seed_calendar_events
where not exists (
  select 1
  from public.calendar_events existing
  where existing.project_id is not distinct from seed_calendar_events.project_id
    and existing.title = seed_calendar_events.title
    and existing.event_date = seed_calendar_events.event_date
);

-- 4. 新增下次會議主題公告。
insert into public.announcements (title, body)
select
  '下次AI委員會工作會議：主議題預告',
  '下次會議時間尚未定案（線上會議）。

主要議題：
1. AI工作坊執行進度（Candice）
2. AI社務系統上雲進度（Vivian）
3. AI平台MVP展示（Jim）
4. 扶輪ChatBot進度（Jim）
5. Rotary Passport 2.0進度（Wesley）
6. AI影音工作坊進度（Jake）

需邀請：AI相關負責人、IDG Computer、APPS團隊、Jack。

重要日期提醒：
• 2026-06-27 Jim 完成與 CP AI/Gayvin 後端規格討論
• 2026-06-28 Vivian 完成與 IDG Computer 對接、場地確認
• 2026-07-01 首支宣傳影片發布、工作坊報名公告
• 2026-07-03 AI平台MVP展示、扶輪ChatBot MVP 釋出
• 2026-07-18 社秘會議現場宣導
• 2026-07-26 第一場AI工作坊舉辦'
where not exists (
  select 1
  from public.announcements
  where title = '下次AI委員會工作會議：主議題預告'
);
