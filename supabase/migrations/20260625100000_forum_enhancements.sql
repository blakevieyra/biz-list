-- Add image support to forum posts
alter table forum_posts add column if not exists image_url text;

-- Track "Interested" / likes on forum posts
create table if not exists forum_post_likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references forum_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

alter table forum_post_likes enable row level security;

create policy "Anyone can read forum post likes"
  on forum_post_likes for select using (true);

create policy "Authenticated users can add likes"
  on forum_post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own likes"
  on forum_post_likes for delete
  using (auth.uid() = user_id);
