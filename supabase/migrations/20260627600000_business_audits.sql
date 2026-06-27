create table if not exists public.business_audits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  result      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_business_audits_user
  on public.business_audits (user_id, created_at desc);

alter table public.business_audits enable row level security;

create policy "Users can view own audits"
  on public.business_audits for select
  using (auth.uid() = user_id);

create policy "Users can insert own audits"
  on public.business_audits for insert
  with check (auth.uid() = user_id);
