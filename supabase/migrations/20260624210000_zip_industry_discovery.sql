-- Zip codes for local discovery and structured industry interests for customers.

alter table public.profiles
  add column if not exists zip_code text not null default '',
  add column if not exists industry_interests text[] not null default '{}';

alter table public.businesses
  add column if not exists zip_code text not null default '';

create index if not exists profiles_zip_code_idx on public.profiles (zip_code);
create index if not exists businesses_zip_code_idx on public.businesses (zip_code);
create index if not exists profiles_industry_interests_idx on public.profiles using gin (industry_interests);
