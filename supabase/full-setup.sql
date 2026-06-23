-- =============================================================================
-- AllConnect — FULL SETUP (idempotent / safe to re-run)
-- Paste entire file into Supabase Dashboard → SQL Editor → Run
-- Includes: base schema + Pro plan + RLS policies
-- =============================================================================

-- 1) Extensions
create extension if not exists "pgcrypto";

-- 2) Enum types (skip if already exist)
do $$ begin
  create type public.user_role as enum ('business', 'organization', 'customer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.business_intent as enum (
    'hiring', 'seeking_customers', 'seeking_advice', 'open_to_partnerships'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.forum_category as enum (
    'general', 'legal_lessons', 'local', 'hiring', 'partnerships'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.connection_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum (
    'follow', 'connection', 'comment', 'message', 'collaboration'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.collaboration_status as enum ('open', 'in_discussion', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.plan_tier as enum ('free', 'pro');
exception when duplicate_object then null;
end $$;

-- 3) Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  role public.user_role not null default 'customer',
  bio text not null default '',
  city text not null default '',
  state text not null default '',
  forum_interests public.forum_category[] not null default '{}',
  plan_tier public.plan_tier not null default 'free',
  plan_started_at timestamptz,
  interest_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Add Pro columns if profiles existed before this script
alter table public.profiles
  add column if not exists plan_tier public.plan_tier not null default 'free',
  add column if not exists plan_started_at timestamptz,
  add column if not exists interest_tags text[] not null default '{}';

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  category text not null default '',
  city text not null default '',
  state text not null default '',
  website text,
  intents public.business_intent[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.business_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, business_id)
);

create table if not exists public.business_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, business_id)
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category public.forum_category not null default 'general',
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text not null,
  summary text not null,
  looking_for text not null,
  location text not null,
  status public.collaboration_status not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles (id) on delete cascade,
  participant_b uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  website_url text not null default '',
  business_name text not null default '',
  category text not null default '',
  overall_score int not null check (overall_score between 0 and 100),
  seo_score int not null check (seo_score between 0 and 100),
  online_presence_score int not null check (online_presence_score between 0 and 100),
  business_clarity_score int not null check (business_clarity_score between 0 and 100),
  summary text not null,
  recommendations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- 4) Indexes
create index if not exists idx_businesses_owner on public.businesses (owner_id);
create index if not exists idx_business_follows_business on public.business_follows (business_id);
create index if not exists idx_forum_posts_category on public.forum_posts (category);
create index if not exists idx_forum_comments_post on public.forum_comments (post_id);
create index if not exists idx_notifications_user on public.notifications (user_id, read);
create index if not exists idx_messages_conversation on public.messages (conversation_id);
create index if not exists idx_ai_assessments_user on public.ai_assessments (user_id);
create index if not exists idx_profiles_plan on public.profiles (plan_tier);
create index if not exists idx_profiles_location on public.profiles (state, city);

-- 5) Auth trigger — auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 6) Row Level Security
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_follows enable row level security;
alter table public.business_connections enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.collaborations enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_assessments enable row level security;

-- 7) Policies (drop first so re-run never fails)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

drop policy if exists "Businesses are viewable by everyone" on public.businesses;
create policy "Businesses are viewable by everyone"
  on public.businesses for select using (true);

drop policy if exists "Users can insert own businesses" on public.businesses;
create policy "Users can insert own businesses"
  on public.businesses for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update own businesses" on public.businesses;
create policy "Owners can update own businesses"
  on public.businesses for update using (auth.uid() = owner_id);

drop policy if exists "Follows are viewable by everyone" on public.business_follows;
create policy "Follows are viewable by everyone"
  on public.business_follows for select using (true);

drop policy if exists "Users can follow businesses" on public.business_follows;
create policy "Users can follow businesses"
  on public.business_follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.business_follows;
create policy "Users can unfollow"
  on public.business_follows for delete using (auth.uid() = follower_id);

drop policy if exists "Connections are viewable by involved users" on public.business_connections;
create policy "Connections are viewable by involved users"
  on public.business_connections for select using (
    auth.uid() = requester_id
    or auth.uid() = (select owner_id from public.businesses where id = business_id)
  );

drop policy if exists "Users can request connections" on public.business_connections;
create policy "Users can request connections"
  on public.business_connections for insert with check (auth.uid() = requester_id);

drop policy if exists "Business owners can update connection status" on public.business_connections;
create policy "Business owners can update connection status"
  on public.business_connections for update using (
    auth.uid() = (select owner_id from public.businesses where id = business_id)
  );

drop policy if exists "Forum posts are public" on public.forum_posts;
create policy "Forum posts are public"
  on public.forum_posts for select using (true);

drop policy if exists "Authenticated users can create posts" on public.forum_posts;
create policy "Authenticated users can create posts"
  on public.forum_posts for insert with check (auth.uid() = author_id);

drop policy if exists "Forum comments are public" on public.forum_comments;
create policy "Forum comments are public"
  on public.forum_comments for select using (true);

drop policy if exists "Authenticated users can comment" on public.forum_comments;
create policy "Authenticated users can comment"
  on public.forum_comments for insert with check (auth.uid() = author_id);

drop policy if exists "Collaborations are public" on public.collaborations;
create policy "Collaborations are public"
  on public.collaborations for select using (true);

drop policy if exists "Authenticated users can create collaborations" on public.collaborations;
create policy "Authenticated users can create collaborations"
  on public.collaborations for insert with check (auth.uid() = author_id);

drop policy if exists "Users see own notifications" on public.notifications;
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert with check (true);

drop policy if exists "Users can mark notifications read" on public.notifications;
create policy "Users can mark notifications read"
  on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations"
  on public.conversations for select using (
    auth.uid() = participant_a or auth.uid() = participant_b
  );

drop policy if exists "Participants can create conversations" on public.conversations;
create policy "Participants can create conversations"
  on public.conversations for insert with check (
    auth.uid() = participant_a or auth.uid() = participant_b
  );

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read"
  on public.messages for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

drop policy if exists "Pro users can view own assessments" on public.ai_assessments;
create policy "Pro users can view own assessments"
  on public.ai_assessments for select using (auth.uid() = user_id);

drop policy if exists "Pro users can create own assessments" on public.ai_assessments;
create policy "Pro users can create own assessments"
  on public.ai_assessments for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.plan_tier = 'pro'
    )
  );

-- Done
select 'AllConnect schema setup complete' as status;
