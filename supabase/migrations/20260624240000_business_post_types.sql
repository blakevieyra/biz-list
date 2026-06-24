-- Post types for business marketing content: updates, jobs, deals, video.

alter table public.business_posts
  add column if not exists post_type text not null default 'update'
    check (post_type in ('update', 'job', 'deal', 'video'));

create index if not exists idx_business_posts_type on public.business_posts (post_type, created_at desc);
