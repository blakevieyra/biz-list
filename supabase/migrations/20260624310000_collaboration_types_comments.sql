-- Collaboration categories and discussion threads
alter table public.collaborations
  add column if not exists collaboration_type text not null default 'proposal'
    check (collaboration_type in ('proposal', 'contract', 'b2b_sale'));

create table if not exists public.collaboration_comments (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_collaboration_comments_collab
  on public.collaboration_comments (collaboration_id, created_at);

alter table public.collaboration_comments enable row level security;

drop policy if exists "Collaboration comments are public" on public.collaboration_comments;
create policy "Collaboration comments are public"
  on public.collaboration_comments for select using (true);

drop policy if exists "Authenticated users can comment on collaborations" on public.collaboration_comments;
create policy "Authenticated users can comment on collaborations"
  on public.collaboration_comments for insert with check (auth.uid() = author_id);
