-- Business ↔ Marketer affiliate relationships
create table if not exists business_affiliates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  marketer_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'declined')),
  created_at timestamptz default now(),
  unique(business_id, marketer_id)
);

alter table business_affiliates enable row level security;

-- Marketer sees their own affiliations
create policy "Marketer sees own affiliations"
  on business_affiliates for select
  using (marketer_id = auth.uid());

-- Business owner sees affiliates for their business
create policy "Owner sees business affiliates"
  on business_affiliates for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- Marketer can request (insert with own marketer_id)
create policy "Marketer can request affiliation"
  on business_affiliates for insert
  with check (marketer_id = auth.uid());

-- Business owner can update status (accept/decline)
create policy "Owner can update affiliate status"
  on business_affiliates for update
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- Either party can delete
create policy "Either party can remove affiliation"
  on business_affiliates for delete
  using (
    marketer_id = auth.uid() or
    business_id in (select id from businesses where owner_id = auth.uid())
  );
