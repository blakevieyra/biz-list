-- Pro plan: AI assessments + local lead access

create type plan_tier as enum ('free', 'pro');

alter table public.profiles
  add column if not exists plan_tier plan_tier not null default 'free',
  add column if not exists plan_started_at timestamptz,
  add column if not exists interest_tags text[] not null default '{}';

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

create index if not exists idx_ai_assessments_user on public.ai_assessments (user_id);
create index if not exists idx_profiles_plan on public.profiles (plan_tier);
create index if not exists idx_profiles_location on public.profiles (state, city);

alter table public.ai_assessments enable row level security;

create policy "Pro users can view own assessments"
  on public.ai_assessments for select using (auth.uid() = user_id);

create policy "Pro users can create own assessments"
  on public.ai_assessments for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.plan_tier = 'pro'
    )
  );
