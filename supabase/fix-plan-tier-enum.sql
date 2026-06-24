-- RUN THIS FIRST if you see: invalid input value for enum plan_tier: "platinum"
-- Supabase SQL Editor: run this block alone, then run 20260623180000_security_hardening.sql

alter type public.plan_tier add value if not exists 'basic';

-- Must be separate from above in some Postgres versions — if the next line errors with
-- "already exists", ignore it and continue.
alter type public.plan_tier add value if not exists 'platinum';

select enumlabel as plan_tier_values
from pg_enum e
join pg_type t on e.enumtypid = t.oid
where t.typname = 'plan_tier'
order by e.enumsortorder;
