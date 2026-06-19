insert into public.organizations (name, slug)
values ('Rotary District 3481 AI Committee', 'rotary-3481-ai')
on conflict (slug) do nothing;

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
    ('AI Workshop', 'ai-workshop', 'AI workshop planning, curriculum, registration, and follow-up.'),
    ('AI Club Administration System', 'ai-club-administration-system', 'Internal club administration platform work.'),
    ('Rotary 3481 Chatbot', 'rotary-3481-chatbot', 'District chatbot project planning and delivery.'),
    ('AI Video Workshop', 'ai-video-workshop', 'AI video workshop planning, assets, and delivery.'),
    ('Rotary Passport 2.0', 'rotary-passport-2', 'Rotary Passport 2.0 product and migration work.'),
    ('Rotary AI Platform', 'rotary-ai-platform', 'This project management platform.'),
    ('Cloud Account And Access Management', 'cloud-account-access-management', 'Cloud account, permissions, security, and access tracking.')
) as seed(name, slug, description)
where organizations.slug = 'rotary-3481-ai'
on conflict (slug) do nothing;
