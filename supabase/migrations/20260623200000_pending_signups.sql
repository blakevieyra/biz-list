-- Pending signups: SendGrid verification before Supabase user is created
create table if not exists public.pending_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  password_ciphertext text not null,
  password_iv text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pending_signups_email_idx on public.pending_signups (lower(email));

-- RLS enabled with no policies = deny-all for anon/authenticated roles.
-- The service_role (used by server-side auth actions) bypasses RLS by default.
-- Do NOT add permissive policies here; this table must only be accessed server-side.
alter table public.pending_signups enable row level security;

create or replace function public.auth_email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  select exists (
    select 1 from auth.users where lower(email) = lower(check_email)
  );
$$;

revoke all on function public.auth_email_exists(text) from public;
grant execute on function public.auth_email_exists(text) to service_role;

select 'Pending signups migration complete' as status;
