-- Agent automation tasks stored as JSONB on the business row
alter table public.businesses
  add column if not exists agent_automations jsonb not null default '{}'::jsonb;
