-- AllConnect business platform expansion
-- Safe to re-run after full-setup.sql

do $$ begin
  alter type public.plan_tier add value if not exists 'basic';
exception when others then null;
end $$;

do $$ begin
  alter type public.plan_tier add value if not exists 'platinum';
exception when others then null;
end $$;

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

alter table public.businesses
  add column if not exists phone text not null default '',
  add column if not exists hours text not null default '',
  add column if not exists important_info text not null default '',
  add column if not exists is_hiring boolean not null default false,
  add column if not exists services jsonb not null default '[]',
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists like_count int not null default 0,
  add column if not exists rating_avg numeric(3,2) not null default 0,
  add column if not exists rating_count int not null default 0;

create table if not exists public.business_likes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  created_at timestamptz not null default now(),
  unique (business_id, author_id)
);

create table if not exists public.business_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  media_urls text[] not null default '{}',
  engagement_score int not null default 0,
  is_trending boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.business_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.business_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.work_groups (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text not null,
  focus_area text not null default 'planning',
  description text not null,
  location text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text not null,
  channel text not null default 'email',
  content text not null,
  status text not null default 'draft',
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_business_posts_business on public.business_posts (business_id);
create index if not exists idx_business_posts_trending on public.business_posts (is_trending, engagement_score desc);
create index if not exists idx_business_reviews_business on public.business_reviews (business_id);
create index if not exists idx_business_likes_business on public.business_likes (business_id);

alter table public.business_likes enable row level security;
alter table public.business_reviews enable row level security;
alter table public.business_posts enable row level security;
alter table public.business_post_comments enable row level security;
alter table public.work_groups enable row level security;
alter table public.marketing_campaigns enable row level security;

drop policy if exists "Likes are public" on public.business_likes;
create policy "Likes are public" on public.business_likes for select using (true);
drop policy if exists "Users can like businesses" on public.business_likes;
create policy "Users can like businesses" on public.business_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can unlike" on public.business_likes;
create policy "Users can unlike" on public.business_likes for delete using (auth.uid() = user_id);

drop policy if exists "Reviews are public" on public.business_reviews;
create policy "Reviews are public" on public.business_reviews for select using (true);
drop policy if exists "Users can review businesses" on public.business_reviews;
create policy "Users can review businesses" on public.business_reviews for insert with check (auth.uid() = author_id);
drop policy if exists "Users can update own reviews" on public.business_reviews;
create policy "Users can update own reviews" on public.business_reviews for update using (auth.uid() = author_id);

drop policy if exists "Business posts are public" on public.business_posts;
create policy "Business posts are public" on public.business_posts for select using (true);
drop policy if exists "Business owners can post" on public.business_posts;
create policy "Business owners can post" on public.business_posts for insert with check (
  auth.uid() = author_id
  and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
);

drop policy if exists "Post comments are public" on public.business_post_comments;
create policy "Post comments are public" on public.business_post_comments for select using (true);
drop policy if exists "Authenticated users comment on business posts" on public.business_post_comments;
create policy "Authenticated users comment on business posts" on public.business_post_comments for insert with check (auth.uid() = author_id);

drop policy if exists "Work groups are public" on public.work_groups;
create policy "Work groups are public" on public.work_groups for select using (true);
drop policy if exists "Users can create work groups" on public.work_groups;
create policy "Users can create work groups" on public.work_groups for insert with check (auth.uid() = creator_id);

drop policy if exists "Owners see own campaigns" on public.marketing_campaigns;
create policy "Owners see own campaigns" on public.marketing_campaigns for select using (auth.uid() = user_id);
drop policy if exists "Platinum users create campaigns" on public.marketing_campaigns;
create policy "Platinum users create campaigns" on public.marketing_campaigns for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.plan_tier = 'platinum')
);

create or replace function public.refresh_business_rating()
returns trigger
language plpgsql
as $$
begin
  update public.businesses b
  set
    rating_avg = coalesce((select avg(rating)::numeric(3,2) from public.business_reviews where business_id = coalesce(new.business_id, old.business_id)), 0),
    rating_count = (select count(*) from public.business_reviews where business_id = coalesce(new.business_id, old.business_id))
  where b.id = coalesce(new.business_id, old.business_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists business_reviews_rating on public.business_reviews;
create trigger business_reviews_rating
  after insert or update or delete on public.business_reviews
  for each row execute function public.refresh_business_rating();

create or replace function public.refresh_business_likes()
returns trigger
language plpgsql
as $$
begin
  update public.businesses b
  set like_count = (select count(*) from public.business_likes where business_id = coalesce(new.business_id, old.business_id))
  where b.id = coalesce(new.business_id, old.business_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists business_likes_count on public.business_likes;
create trigger business_likes_count
  after insert or delete on public.business_likes
  for each row execute function public.refresh_business_likes();

select 'Business platform migration complete' as status;
