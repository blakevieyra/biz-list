-- In-app service orders when businesses use custom order forms.

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  service_name text not null default '',
  message text not null default '',
  quantity text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists idx_service_orders_business on public.service_orders (business_id);
create index if not exists idx_service_orders_customer on public.service_orders (customer_id);

alter table public.service_orders enable row level security;

drop policy if exists "Service orders visible to customer and owner" on public.service_orders;
create policy "Service orders visible to customer and owner"
  on public.service_orders for select using (
    auth.uid() = customer_id
    or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can place service orders" on public.service_orders;
create policy "Users can place service orders"
  on public.service_orders for insert with check (
    auth.uid() = customer_id
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id <> auth.uid()
    )
  );

drop policy if exists "Business owners can update service order status" on public.service_orders;
create policy "Business owners can update service order status"
  on public.service_orders for update using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );
