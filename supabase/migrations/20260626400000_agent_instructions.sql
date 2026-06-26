alter table public.businesses
  add column if not exists agent_instructions text not null default '';

alter table public.businesses
  add column if not exists agent_topic_rules jsonb not null default '[]'::jsonb;
