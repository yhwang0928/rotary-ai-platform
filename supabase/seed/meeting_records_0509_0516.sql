do $$
declare
  m1_id uuid := '11111111-0509-0000-0000-000000000001';
  m2_id uuid := '11111111-0516-0000-0000-000000000002';
begin

insert into public.meetings (id, project_id, title, meeting_date, starts_at, ends_at, summary, notes, google_meet_url)
values (
  m1_id,
  null,
  'AI委員會第一次技術會議',
  '2026-05-09',
  '2026-05-09 10:00:00+08',
  '2026-05-09 12:00:00+08',
  '確立第一階段以「可執行、可展示、可回報進度」為核心原則，聚焦七大項目：AI工作坊、ChatBot、公關發文、服務影音、扶輪會計系統、扶輪護照2.0、各社AI委員對接。',
  E'出席：PDG APPS、IDG Computer、龍翔社 PT、龍山社 Jake、宇宙社 CP AI、旭光社 Candice、英倫社 Kent、永恆社 Vivian、正向衛星社 Jim、永心社 CP Wesley\n地點：杭州南路\n主席：台北永恆社 P Vivian（王沛昀）\n記錄：旭光社 Candice、Kent',
  null
),
(
  m2_id,
  null,
  'AI委員會第二次技術會議',
  '2026-05-16',
  '2026-05-16 10:00:00+08',
  '2026-05-16 12:00:00+08',
  '確認AI工作坊兩場規劃（執秘場6/28、社長場7/12）；AI社務系統定名並列入甘特圖、佐證資料等模組；IDG評估單一入口平台；ChatBot確認架構；AI影音工作坊由Jake負責；Rotary Passport 2.0另案規劃。',
  E'出席：IDG Computer、PT、Kent、Candice、Jack、Jake、CP AI、Vivian、Wesley\n會議方式：Zoom線上會議',
  null
)
on conflict (id) do nothing;

insert into public.meeting_decisions (meeting_id, decision)
values
  (m1_id, 'AI工作坊列為第一優先執行項目。第一場以「AI入門與執秘社務應用」為主題，課程涵蓋：社刊製作、FB貼文、活動紀錄、服務影音、會議紀錄、活動報名、AI Agent。6月底上任前舉辦2場（執秘一場、社長一場），每次兩小時，全年共14場。'),
  (m1_id, 'ChatBot先做MVP，開放10人測試，不急於全面上線。下次會議各負責人回報使用情境、資料來源及技術評估結果。入口管道以LINE官方帳號為主。'),
  (m1_id, '公關發文列入工作坊主題，由PT負責提供內容方向與貼文範例。AI可協助各社產出FB貼文、社刊內容及活動紀錄初稿。'),
  (m1_id, '服務影音先製作示範影片，不先全面推廣。示範影片完成後作為工作坊教材。'),
  (m1_id, '扶輪會計系統待PDG APPS開發完成後討論。'),
  (m1_id, '扶輪護照2.0先進行需求盤點，下次會議回報身分認證、帳號資料及職業資訊規劃。'),
  (m1_id, '各社AI委員對接：由Vivian規劃對接方式，並擬定邀請各社指派AI委員之流程。'),
  (m1_id, '臨時動議：QR Code簽到系統列為後續評估項目，本階段暫不分派執行人。'),
  (m2_id, 'AI工作坊分為兩場：執秘場（AI入門與執秘社務應用，6/28，不收費，IDG準備伴手禮）；社長場（AI協助社長掌握總監獎項與年度社務管理，暫定7/12下午，收費200元）。現場需安排小幫手6-8位。'),
  (m2_id, 'AI社務系統定名，分為MAIN管理端及各社使用端。納入模組：總監獎項、年度社務總表、甘特圖、佐證資料、活動紀錄、公共形象貼文、基金捐獻、GG案、IOU紀錄、社友通訊錄、社友職業資料。各社只能查看與更新自己社資料。'),
  (m2_id, '採用單一入口平台作為後續系統整合方向，請IDG評估雲端平台、系統帳號、資料庫、權限設定、資安需求、採購需求與費用。'),
  (m2_id, '建置3481地區扶輪Chatbot。第一階段以扶輪既有資料與3481地區正式資料為主要知識來源。Jake作為資源/測試組。'),
  (m2_id, 'AI影音工作坊列為後續進階課程，Jake於6月底前完成規劃並安排委員會首場。'),
  (m2_id, 'Rotary Passport 2.0另案規劃，Wesley負責彙整具體需求與功能清單，PT協助確認方向。')
on conflict do nothing;

insert into public.action_items (meeting_id, title, description, due_date, status, owner_names, collaborator_names)
values
  (m1_id, '規劃第一場AI工作坊課程大綱', '含講師、流程、小幫手分工', '2026-05-16', 'todo', 'PT、Candice、Kent、Vivian', null),
  (m1_id, '初步排定全年12至14場工作坊主題清單', null, '2026-05-16', 'todo', 'PT、Candice、Kent、Vivian', null),
  (m1_id, '整理執秘社務痛點，轉為具體可用AI解決之課程題目', null, '2026-05-16', 'todo', 'Wesley、Vivian', null),
  (m1_id, '提出第一階段ChatBot使用情境', '社友可能會問哪些問題', '2026-05-16', 'todo', 'IDG Computer、CP AI、Jim、Wesley', null),
  (m1_id, '評估LINE、官網、扶輪護照2.0等入口管道', null, '2026-05-16', 'todo', 'IDG Computer、CP AI、Jim、Jake', null),
  (m1_id, '回報ChatBot平台成本、使用權限及維護方式', null, '2026-05-16', 'todo', 'IDG Computer、CP AI、Jim、Jake', null),
  (m1_id, '盤點可提供之扶輪及3481地區相關資料來源', null, '2026-05-16', 'todo', 'PDG APPS', null),
  (m1_id, '提供公關發文教學方向與社群語氣建議', null, '2026-05-16', 'todo', 'PT', null),
  (m1_id, '準備FB貼文範例供工作坊使用', null, '2026-05-16', 'todo', 'PT', null),
  (m1_id, '製作服務影音示範影片', null, '2026-05-16', 'todo', 'Vivian', null),
  (m1_id, '規劃服務影音流程、格式與投稿規則', null, '2026-05-16', 'todo', 'Jake', null),
  (m1_id, '盤點扶輪護照2.0功能需求清單', null, '2026-05-16', 'todo', 'Wesley', null),
  (m1_id, '規劃各社AI委員對接方式與聯絡機制', null, '2026-05-16', 'todo', 'Vivian', null),
  (m2_id, '統籌AI工作坊規劃與報名表', null, '2026-05-20', 'todo', 'Vivian', null),
  (m2_id, '討論AI工作坊初版規劃並定版', null, '2026-06-06', 'todo', 'Vivian、PT', null),
  (m2_id, '確認6/28執秘場場地與流程', null, '2026-06-06', 'todo', 'Vivian、Candice', null),
  (m2_id, '準備6/28執秘場伴手禮', null, '2026-06-28', 'todo', 'IDG', null),
  (m2_id, '找好現場小幫手6-8位', null, '2026-06-28', 'todo', 'Vivian、PT、Candice', null),
  (m2_id, '修正AI社務系統原型並納入社友通訊錄及職業資料', null, '2026-05-22', 'todo', 'Vivian', null),
  (m2_id, '評估單一入口平台、雲端平台、帳號、資料庫、權限及採購需求', null, '2026-06-06', 'todo', 'IDG', null),
  (m2_id, '確認3481地區扶輪Chatbot架構與扶輪資料來源', null, '2026-06-06', 'todo', 'CP AI、Jim、IDG', null),
  (m2_id, '提出3481地區扶輪Chatbot初版測試', null, '2026-06-06', 'todo', 'CP AI、Jim', 'IDG'),
  (m2_id, '完成AI影音工作坊規劃並安排委員會首場', null, '2026-06-30', 'todo', 'Jake', 'PT、Vivian'),
  (m2_id, '彙整Rotary Passport 2.0具體需求與功能清單', null, '2026-06-06', 'todo', 'Wesley、PT', null)
on conflict do nothing;

end $$;
