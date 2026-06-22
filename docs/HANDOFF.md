# Handoff Notes

Last updated: 2026-06-22

## Current Project State

- Local repo: `/Users/yikaihuang/Desktop/Codex/rotary-ai-platform`
- GitHub repo: `https://github.com/yhwang0928/rotary-ai-platform.git`
- Supabase project URL: `https://ffbaaqrvlcrxfdxyfdzs.supabase.co`
- Cloudflare Pages: `https://rotary-ai-platform.pages.dev/` (auto-deploy on push to main)
- Local dev: `pnpm dev` → `http://localhost:5173/`

## What Has Been Built (2026-06-19 ~ 2026-06-22)

### 平台功能
- Vite + React + TypeScript 前端，Supabase Postgres + RLS 後端
- 登入驗證（Supabase Auth）
- 專案管理：列表、詳情、甘特圖（週/月切換）、新增/編輯/刪除
- 任務管理：狀態（backlog/todo/doing/review/done/blocked/cancelled）、優先級、負責人、期限
- 會議記錄：結構化新增與編輯表單（會議資訊、決議、待辦、下次會議），新增/編輯共用相同欄位，編輯時從 HTML 解析預填
- 公告模組：新增/刪除公告
- 行事曆：月曆視圖，顯示專案、任務、會議、自訂活動，Rotary 月份主題
- Google Drive 資料夾面板（嵌入式 iframe）
- 會議記錄匯入：支援 Word/文字檔上傳、音訊上傳、即時錄音，透過 Cloudflare AI 整理成結構化格式

### 成員選單
- 固定成員：Candice、PT、Vivian、Kent、Jake、Eric、CP AI、Jim、Wesley
- 單人欄位（主持人、負責人、合作對象）：datalist 自動補全
- 多人欄位（與會人員、待確認出席、需邀請人員）：chip 點選 + 自訂輸入框（Enter 或 + 新增）

### 資料（已透過 Supabase SQL Editor 套用）
- 七個初始專案（AI工作坊、AI影音工作坊、AI社務系統上雲部署、扶輪ChatBot、Rotary Passport 2.0、職業分類與會員資料收集 等）
- 依 2026-06-20 會議記錄更新六個專案負責人、目的說明、時程
- 24 項任務依會議決議建立，含負責人與截止日
- 公告：下次會議主議題預告

## Key Files

| 檔案 | 說明 |
|------|------|
| `src/App.tsx` | 主元件（2500+ 行，含所有頁面與邏輯） |
| `src/styles.css` | 全域樣式（深藍主題、金色點綴） |
| `src/lib/types.ts` | TypeScript 型別定義 |
| `src/lib/supabase.ts` | Supabase client 初始化 |
| `supabase/migrations/` | 所有 schema 變更記錄 |
| `supabase/seed/` | 初始資料與會議更新 SQL |
| `docs/REQUIREMENTS.md` | 功能需求文件 |
| `wrangler.toml` | Cloudflare Pages 部署設定 |

## Environment Variables (.env.local)

```
VITE_SUPABASE_URL=https://ffbaaqrvlcrxfdxyfdzs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VTg2wJLLkmQ8UTphQ9Ul9A_YzVhGSl_
```

## How To Run Locally

```bash
pnpm install
cp .env.example .env.local   # 填入上方 env vars
pnpm dev
```

## Known Issues / Risks

- `addMeetingRecord` 新增後若 Supabase RLS 擋住 INSERT，畫面現在會顯示具體錯誤訊息（之前靜默失敗）
- 會議記錄編輯表單從 HTML 解析預填，極端格式異動可能解析不完整（主要影響舊格式資料）
- Google Calendar/Meet OAuth、Email 提醒尚未實作
- 即時錄音匯入依賴 Cloudflare AI Worker（`import-meeting-doc` Edge Function），需確認部署狀態

## Next Steps

- 確認下次 AI 委員會工作會議時間並更新公告
- 測試各成員登入後的 RLS 權限（project_lead、member、viewer 角色）
- 追蹤 2026-06-27 Jim / 2026-06-28 Vivian 的關鍵任務進度
- 考慮將 `App.tsx` 拆分為多個元件檔案（目前 2500+ 行）
