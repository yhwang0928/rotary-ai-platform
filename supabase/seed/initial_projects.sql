insert into public.organizations (name, slug)
values ('國際扶輪 3481 地區 AI 委員會', 'rotary-3481-ai')
on conflict (slug) do update
set name = excluded.name;

insert into public.projects (organization_id, name, slug, description, status)
select
  organizations.id,
  seed.name,
  seed.slug,
  seed.description,
  'active'::public.project_status
from public.organizations
cross join (
  values
    ('AI 工作坊', 'ai-workshop', 'AI 工作坊規劃、課程、報名與後續追蹤。'),
    ('AI 社務行政系統', 'ai-club-administration-system', '社務行政內部平台建置工作。'),
    ('3481 扶輪 AI 聊天機器人', 'rotary-3481-chatbot', '地區聊天機器人專案規劃與交付。'),
    ('AI 影片工作坊', 'ai-video-workshop', 'AI 影片工作坊規劃、素材與執行。'),
    ('Rotary Passport 2.0', 'rotary-passport-2', 'Rotary Passport 2.0 產品與移轉工作。'),
    ('3481 Rotary AI專案管理平台', 'rotary-ai-platform', '3481 Rotary AI 專案管理平台建置。'),
    ('雲端帳號與權限管理', 'cloud-account-access-management', '雲端帳號、權限、安全與存取追蹤。')
) as seed(name, slug, description)
where organizations.slug = 'rotary-3481-ai'
on conflict (slug) do update
set
  organization_id = excluded.organization_id,
  name = excluded.name,
  description = excluded.description,
  status = excluded.status;
