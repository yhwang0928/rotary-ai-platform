-- ============================================================
-- 依據 2026-06-20 AI委員會會議記錄更新專案資料、任務與公告
-- 執行方式：貼到 Supabase SQL Editor → Run
-- ============================================================

-- ── 1. 更新各專案基本資料（負責人、目的說明） ────────────────

UPDATE public.projects SET
  owner_names        = 'Candice',
  participating_units = 'PT、Vivian、Kent',
  project_purpose    = '舉辦AI工作坊提升地區扶輪社友AI應用能力。第一場邀請各社社長、秘書及AI委員（每社限3人），第二場開放全體社友，職密會員優先。全程錄影，錄檔僅供主辦方存檔。',
  start_date         = '2026-06-20',
  expected_end_date  = '2026-07-26'
WHERE name ILIKE '%AI工作坊%' AND name NOT ILIKE '%影音%';

UPDATE public.projects SET
  owner_names        = 'Jake',
  participating_units = 'PT、Vivian、Prevers（公關委員會）',
  project_purpose    = '製作AI影音內容，呈現扶輪地區年度發展方向與AI委員會核心精神；每月1-2支短影音，呈現各社特色或配合扶輪月主題。Jack負責訓練專屬扶輪影片AI模型。',
  start_date         = '2026-06-20',
  expected_end_date  = '2026-12-31'
WHERE name ILIKE '%影音%';

UPDATE public.projects SET
  owner_names        = 'Vivian',
  participating_units = 'Eric、IDG Computer',
  project_purpose    = '將現有HTML版社務系統進行打包、雲端部署、安全與權限確認，採MVP分階段上線策略，先與IDG Computer對接功能細節。',
  start_date         = '2026-06-20',
  expected_end_date  = '2026-09-30'
WHERE name ILIKE '%社務%' OR name ILIKE '%上雲%';

UPDATE public.projects SET
  owner_names        = 'Jim',
  participating_units = 'CP AI、Gayvin',
  project_purpose    = '建置扶輪ChatBot，初期運用CP AI主機資源，預定7月3日釋出第一版MVP。Vivian彙整總會文獻，IDG Computer提供地區網站歷年數位資料作為知識庫。',
  start_date         = '2026-06-20',
  expected_end_date  = '2026-07-03'
WHERE name ILIKE '%ChatBot%' OR name ILIKE '%chatbot%';

UPDATE public.projects SET
  owner_names        = 'Wesley',
  participating_units = 'PT、Vivian、Candice、IDG Computer',
  project_purpose    = '開發Rotary Passport 2.0，採分階段導入方式，先與IDG Computer進行系統功能對接與盤點，向總監確認項目進展。',
  start_date         = '2026-06-20',
  expected_end_date  = '2026-12-31'
WHERE name ILIKE '%Passport%';

UPDATE public.projects SET
  owner_names        = 'Wesley',
  participating_units = '',
  project_purpose    = '收集會員職業分類資料。第一階段收集公開、低敏感資料；電話、Email等個資待第二階段確認授權後處理。',
  start_date         = '2026-07-01',
  expected_end_date  = '2026-07-31'
WHERE name ILIKE '%職業%' OR name ILIKE '%會員%';


-- ── 2. 為各專案插入任務 ───────────────────────────────────────
-- 使用 DO $$ 避免重複插入（以 title + project_id 為唯一識別）

DO $$
DECLARE
  p_workshop       uuid;
  p_video          uuid;
  p_cloud          uuid;
  p_chatbot        uuid;
  p_passport       uuid;
  p_member         uuid;
BEGIN

  SELECT id INTO p_workshop FROM public.projects WHERE name ILIKE '%AI工作坊%' AND name NOT ILIKE '%影音%' LIMIT 1;
  SELECT id INTO p_video    FROM public.projects WHERE name ILIKE '%影音%' LIMIT 1;
  SELECT id INTO p_cloud    FROM public.projects WHERE name ILIKE '%社務%' OR name ILIKE '%上雲%' LIMIT 1;
  SELECT id INTO p_chatbot  FROM public.projects WHERE name ILIKE '%ChatBot%' OR name ILIKE '%chatbot%' LIMIT 1;
  SELECT id INTO p_passport FROM public.projects WHERE name ILIKE '%Passport%' LIMIT 1;
  SELECT id INTO p_member   FROM public.projects WHERE name ILIKE '%職業%' OR name ILIKE '%會員%' LIMIT 1;

  -- AI 工作坊
  IF p_workshop IS NOT NULL THEN
    INSERT INTO public.tasks (project_id, title, status, priority, owner_names, due_date)
    VALUES
      (p_workshop, '設計工作坊報名表', 'todo', 'p1', 'Candice', '2026-06-28'),
      (p_workshop, '與總監溝通工作坊時間確認', 'todo', 'p1', 'Vivian', '2026-06-28'),
      (p_workshop, '確認工作坊場地與時間可行性', 'todo', 'p1', 'Vivian', '2026-06-28'),
      (p_workshop, '7月1日統一發布報名公告', 'todo', 'p1', 'Candice', '2026-07-01'),
      (p_workshop, '7月18日社秘會議現場宣導', 'todo', 'p2', 'Candice', '2026-07-18'),
      (p_workshop, '舉辦第一場AI工作坊（社長、秘書、AI委員）', 'todo', 'p0', 'Candice', '2026-07-26'),
      (p_workshop, '監控各項執行進度、確保7月3日Demo版本', 'todo', 'p1', 'Candice', '2026-07-03')
    ON CONFLICT DO NOTHING;
  END IF;

  -- AI 影音工作坊
  IF p_video IS NOT NULL THEN
    INSERT INTO public.tasks (project_id, title, status, priority, owner_names, collaborator_names, due_date)
    VALUES
      (p_video, '製作並發布首支宣傳影片（地區年度方向 + AI委員會精神）', 'todo', 'p0', 'Jake', 'PT、Vivian', '2026-07-01'),
      (p_video, '7月18日社秘會播放宣傳影片', 'todo', 'p1', 'Jake', NULL, '2026-07-18'),
      (p_video, '訓練專屬扶輪影片AI模型', 'todo', 'p1', 'Jake', NULL, '2026-09-30'),
      (p_video, '公關委員會協助蒐集資訊與初審', 'todo', 'p2', 'Prevers', NULL, '2026-07-31'),
      (p_video, '每月產出1-2支短影音（各社特色 / 扶輪月主題）', 'doing', 'p2', 'Jake', 'PT、Vivian', '2026-12-31')
    ON CONFLICT DO NOTHING;
  END IF;

  -- AI 社務系統上雲部署
  IF p_cloud IS NOT NULL THEN
    INSERT INTO public.tasks (project_id, title, status, priority, owner_names, collaborator_names, due_date)
    VALUES
      (p_cloud, '與IDG Computer對接系統功能細節', 'todo', 'p0', 'Vivian', 'IDG Computer', '2026-06-28'),
      (p_cloud, '評估MVP分階段上線可行性', 'todo', 'p0', 'Vivian', 'Eric', '2026-06-28'),
      (p_cloud, '完成打包與雲端部署', 'todo', 'p1', 'Vivian', 'Eric', '2026-09-30'),
      (p_cloud, '安全與權限確認', 'todo', 'p1', 'Vivian', 'Eric', '2026-09-30')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 扶輪ChatBot
  IF p_chatbot IS NOT NULL THEN
    INSERT INTO public.tasks (project_id, title, status, priority, owner_names, collaborator_names, due_date)
    VALUES
      (p_chatbot, '與CP AI/Gayvin約時間討論MVP後端規格', 'todo', 'p0', 'Jim', 'CP AI', '2026-06-27'),
      (p_chatbot, '釋出第一版MVP', 'todo', 'p0', 'Jim', 'CP AI', '2026-07-03'),
      (p_chatbot, '彙整國際扶輪總會文獻作為知識庫', 'todo', 'p1', 'Vivian', NULL, '2026-07-20'),
      (p_chatbot, 'IDG Computer提供地區網站歷年數位資料', 'todo', 'p1', 'IDG Computer', NULL, '2026-07-20')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Rotary Passport 2.0
  IF p_passport IS NOT NULL THEN
    INSERT INTO public.tasks (project_id, title, status, priority, owner_names, collaborator_names, due_date)
    VALUES
      (p_passport, '向總監確認2.0項目進展', 'todo', 'p0', 'Wesley', NULL, '2026-06-28'),
      (p_passport, '與IDG Computer召開系統功能對接與盤點會議', 'todo', 'p0', 'Wesley', 'Vivian、IDG Computer', '2026-06-28'),
      (p_passport, '確認分階段導入計畫', 'todo', 'p1', 'Wesley', 'Vivian、Candice', '2026-07-31')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 職業分類與會員資料收集
  IF p_member IS NOT NULL THEN
    INSERT INTO public.tasks (project_id, title, status, priority, owner_names, due_date)
    VALUES
      (p_member, '開始收集第一批公開、低敏感職業分類資料', 'todo', 'p1', 'Wesley', '2026-07-31'),
      (p_member, '確認第二階段個資授權流程（電話、Email）', 'backlog', 'p2', 'Wesley', NULL)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;


-- ── 3. 新增下次會議主題公告 ──────────────────────────────────

INSERT INTO public.announcements (title, body)
VALUES (
  '⚠️ 下次AI委員會工作會議 — 主議題預告',
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
• 2026-07-03 扶輪ChatBot MVP 釋出
• 2026-07-18 社秘會議現場宣導
• 2026-07-26 第一場AI工作坊舉辦'
);
