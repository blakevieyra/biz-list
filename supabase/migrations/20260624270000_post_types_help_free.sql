-- Help needed and free business post types

alter table public.business_posts drop constraint if exists business_posts_post_type_check;

alter table public.business_posts
  add constraint business_posts_post_type_check
  check (post_type in ('update', 'job', 'deal', 'video', 'help_needed', 'free'));
