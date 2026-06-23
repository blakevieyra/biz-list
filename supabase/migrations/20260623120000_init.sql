-- AllConnect initial schema

create extension if not exists "pgcrypto";

create type user_role as enum ('business', 'organization', 'customer');
create type business_intent as enum (
  'hiring',
  'seeking_customers',
  'seeking_advice',
  'open_to_partnerships'
);
create type forum_category as enum (
  'general',
  'legal_lessons',
  'local',
  'hiring',
  'partnerships'
);
create type connection_status as enum ('pending', 'accepted', 'declined');
create type notification_type as enum (
  'follow',
  'connection',
  'comment',
  'message',
  'collaboration'
);
create type collaboration_status as enum ('open', 'in_discussion', 'closed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null,
  role user_role not null default 'customer',
  bio text not null default '',
  city text not null default '',
  state text not null default '',
  forum_interests forum_category[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  category text not null default '',
  city text not null default '',
  state text not null default '',
  website text,
  intents business_intent[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.business_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, business_id)
);

create table public.business_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  status connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, business_id)
);

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category forum_category not null default 'general',
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.collaborations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  title text not null,
  summary text not null,
  looking_for text not null,
  location text not null,
  status collaboration_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles (id) on delete cascade,
  participant_b uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  created_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_businesses_owner on public.businesses (owner_id);
create index idx_business_follows_business on public.business_follows (business_id);
create index idx_forum_posts_category on public.forum_posts (category);
create index idx_forum_comments_post on public.forum_comments (post_id);
create index idx_notifications_user on public.notifications (user_id, read);
create index idx_messages_conversation on public.messages (conversation_id);

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
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

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

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Businesses are viewable by everyone"
  on public.businesses for select using (true);
create policy "Users can insert own businesses"
  on public.businesses for insert with check (auth.uid() = owner_id);
create policy "Owners can update own businesses"
  on public.businesses for update using (auth.uid() = owner_id);

create policy "Follows are viewable by everyone"
  on public.business_follows for select using (true);
create policy "Users can follow businesses"
  on public.business_follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow"
  on public.business_follows for delete using (auth.uid() = follower_id);

create policy "Connections are viewable by involved users"
  on public.business_connections for select using (
    auth.uid() = requester_id
    or auth.uid() = (select owner_id from public.businesses where id = business_id)
  );
create policy "Users can request connections"
  on public.business_connections for insert with check (auth.uid() = requester_id);
create policy "Business owners can update connection status"
  on public.business_connections for update using (
    auth.uid() = (select owner_id from public.businesses where id = business_id)
  );

create policy "Forum posts are public"
  on public.forum_posts for select using (true);
create policy "Authenticated users can create posts"
  on public.forum_posts for insert with check (auth.uid() = author_id);

create policy "Forum comments are public"
  on public.forum_comments for select using (true);
create policy "Authenticated users can comment"
  on public.forum_comments for insert with check (auth.uid() = author_id);

create policy "Collaborations are public"
  on public.collaborations for select using (true);
create policy "Authenticated users can create collaborations"
  on public.collaborations for insert with check (auth.uid() = author_id);

create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "System can insert notifications"
  on public.notifications for insert with check (true);
create policy "Users can mark notifications read"
  on public.notifications for update using (auth.uid() = user_id);

create policy "Participants can view conversations"
  on public.conversations for select using (
    auth.uid() = participant_a or auth.uid() = participant_b
  );
create policy "Participants can create conversations"
  on public.conversations for insert with check (
    auth.uid() = participant_a or auth.uid() = participant_b
  );

create policy "Participants can view messages"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
create policy "Participants can send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
create policy "Recipients can mark messages read"
  on public.messages for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
