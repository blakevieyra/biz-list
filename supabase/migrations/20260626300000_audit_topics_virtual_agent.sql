alter table public.ai_assessments
  add column if not exists topic_breakdown jsonb not null default '[]'::jsonb;

alter table public.businesses
  add column if not exists virtual_agent_enabled boolean not null default false;
