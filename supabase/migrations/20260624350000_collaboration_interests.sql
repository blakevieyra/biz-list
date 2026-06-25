create table if not exists public.collaboration_interests (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (collaboration_id, user_id)
);

create index if not exists idx_collaboration_interests_collab
  on public.collaboration_interests (collaboration_id);

alter table public.collaboration_interests enable row level security;

drop policy if exists "Collaboration interests are public" on public.collaboration_interests;
create policy "Collaboration interests are public"
  on public.collaboration_interests for select using (true);

drop policy if exists "Authenticated users can express interest" on public.collaboration_interests;
create policy "Authenticated users can express interest"
  on public.collaboration_interests for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove their interest" on public.collaboration_interests;
create policy "Users can remove their interest"
  on public.collaboration_interests for delete using (auth.uid() = user_id);
