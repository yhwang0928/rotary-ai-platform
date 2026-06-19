# 3481 Rotary AI專案管理平台

國際扶輪 3481 地區 AI 委員會內部專案管理平台。

## 技術架構

- Vite + React + TypeScript
- Supabase Auth, Postgres, RLS
- Cloudflare Pages

## 本機設定

1. 安裝套件：

   ```bash
   pnpm install
   ```

2. 複製環境變數：

   ```bash
   cp .env.example .env.local
   ```

3. 填入：

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

4. 依序執行 Supabase SQL：

   ```text
   supabase/migrations/202606190001_initial_foundation.sql
   supabase/seed/initial_projects.sql
   ```

5. 啟動系統：

   ```bash
   pnpm dev
   ```

## 目前範圍

目前已包含 React 應用程式外殼、Supabase client、登入流程、儀表板讀取模型、核心資料表、RLS 政策、任務稽核觸發器，以及初始 Rotary AI 工作群組。

Google Calendar/Meet、電子郵件提醒、任務表格內編輯、甘特圖與 Google Drive 索引是後續里程碑。
