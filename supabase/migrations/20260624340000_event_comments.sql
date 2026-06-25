create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.business_events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_comments_event
  on public.event_comments (event_id, created_at);

alter table public.event_comments enable row level security;

drop policy if exists "Event comments are public" on public.event_comments;
create policy "Event comments are public"
  on public.event_comments for select using (true);

drop policy if exists "Authenticated users can comment on events" on public.event_comments;
create policy "Authenticated users can comment on events"
  on public.event_comments for insert with check (auth.uid() = author_id);
