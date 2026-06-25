alter table public.profiles
  add column if not exists country text not null default 'US';

alter table public.businesses
  add column if not exists country text not null default 'US';

create index if not exists profiles_country_idx on public.profiles (country);
create index if not exists businesses_country_idx on public.businesses (country);
