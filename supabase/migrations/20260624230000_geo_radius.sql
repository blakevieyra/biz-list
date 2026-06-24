-- Geocoordinates for mile-radius discovery and map embeds.

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists discovery_radius text not null default '25'
    check (discovery_radius in ('5', '10', '25', '50', 'state', 'nationwide'));

alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists profiles_discovery_radius_idx on public.profiles (discovery_radius);
create index if not exists businesses_geo_idx on public.businesses (latitude, longitude);
