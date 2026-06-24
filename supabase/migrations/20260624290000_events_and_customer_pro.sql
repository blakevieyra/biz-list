-- Business events, RSVPs, and extended notification types

do $$
begin
  alter type public.notification_type add value if not exists 'event';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.notification_type add value if not exists 'deal_alert';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.notification_type add value if not exists 'job_match';
exception
  when duplicate_object then null;
end $$;

create type public.event_status as enum ('draft', 'published', 'cancelled');

create table if not exists public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  county text not null default '',
  zip_code text not null default '',
  latitude double precision,
  longitude double precision,
  category text not null default '',
  image_url text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity int,
  status public.event_status not null default 'published',
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.business_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'going' check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_business_events_business on public.business_events (business_id);
create index if not exists idx_business_events_starts on public.business_events (starts_at);
create index if not exists idx_business_events_location on public.business_events (state, city);
create index if not exists idx_event_rsvps_event on public.event_rsvps (event_id);
create index if not exists idx_event_rsvps_user on public.event_rsvps (user_id);

alter table public.business_events enable row level security;
alter table public.event_rsvps enable row level security;

create policy "Anyone can view published events"
  on public.business_events for select
  using (status = 'published');

create policy "Business owners manage own events"
  on public.business_events for all
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

create policy "Users view own RSVPs"
  on public.event_rsvps for select
  using (auth.uid() = user_id);

create policy "Anyone can count RSVPs on published events"
  on public.event_rsvps for select
  using (
    exists (
      select 1 from public.business_events e
      where e.id = event_id and e.status = 'published'
    )
  );

create policy "Users manage own RSVPs"
  on public.event_rsvps for insert
  with check (auth.uid() = user_id);

create policy "Users update own RSVPs"
  on public.event_rsvps for update
  using (auth.uid() = user_id);

create policy "Users delete own RSVPs"
  on public.event_rsvps for delete
  using (auth.uid() = user_id);
