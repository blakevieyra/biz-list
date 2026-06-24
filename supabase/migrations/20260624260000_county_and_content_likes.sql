-- County on profiles and businesses; likes on posts, services, and photos

alter table public.profiles
  add column if not exists county text not null default '';

alter table public.businesses
  add column if not exists county text not null default '';

create table if not exists public.business_content_likes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'service', 'photo')),
  target_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, business_id, target_type, target_id)
);

create index if not exists idx_content_likes_business on public.business_content_likes (business_id);
create index if not exists idx_content_likes_target on public.business_content_likes (business_id, target_type, target_id);

alter table public.business_content_likes enable row level security;

drop policy if exists "Content likes are public" on public.business_content_likes;
create policy "Content likes are public"
  on public.business_content_likes for select using (true);

drop policy if exists "Users can like content" on public.business_content_likes;
create policy "Users can like content"
  on public.business_content_likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can unlike content" on public.business_content_likes;
create policy "Users can unlike content"
  on public.business_content_likes for delete using (auth.uid() = user_id);
