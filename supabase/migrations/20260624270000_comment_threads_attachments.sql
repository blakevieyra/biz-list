-- Threaded post comments, attachments, and comment-level likes

alter table public.business_post_comments
  add column if not exists parent_id uuid references public.business_post_comments (id) on delete cascade,
  add column if not exists attachment_url text;

create index if not exists idx_business_post_comments_parent
  on public.business_post_comments (parent_id);

alter table public.business_content_likes
  drop constraint if exists business_content_likes_target_type_check;

alter table public.business_content_likes
  add constraint business_content_likes_target_type_check
  check (target_type in ('post', 'service', 'photo', 'comment'));
