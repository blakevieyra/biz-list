-- Add requirements, deadline, and attachment_urls to collaborations
alter table public.collaborations
  add column if not exists requirements text,
  add column if not exists deadline date,
  add column if not exists attachment_urls text[] not null default '{}';

-- Add attachment_urls to collaboration_comments (for offer responses)
alter table public.collaboration_comments
  add column if not exists attachment_urls text[] not null default '{}';
