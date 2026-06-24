-- Security hardening: billing fields, notifications, assessments, engagement scoring
-- Safe to re-run. Adds missing plan_tier enum values if needed.

-- 0. Extend plan_tier enum (DB may only have free + pro from earlier migrations)
do $$ begin
  alter type public.plan_tier add value if not exists 'basic';
exception
  when duplicate_object then null;
  when others then null;
end $$;

do $$ begin
  alter type public.plan_tier add value if not exists 'platinum';
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- Fallback for Postgres without IF NOT EXISTS on enum (runs in separate transaction blocks)
do $$ begin
  alter type public.plan_tier add value 'basic';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.plan_tier add value 'platinum';
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_started_at timestamptz;

-- 1. Prevent users from self-upgrading plan or editing Stripe fields
create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if new.plan_tier is distinct from old.plan_tier
     or new.plan_started_at is distinct from old.plan_started_at
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id then
    new.plan_tier := old.plan_tier;
    new.plan_started_at := old.plan_started_at;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_billing on public.profiles;
create trigger protect_profile_billing
  before update on public.profiles
  for each row execute function public.protect_profile_billing_fields();

-- 2. Signup always starts as customer (role set during profile create)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email,
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Tighten notification inserts — only service role can insert for other users
drop policy if exists "System can insert notifications" on public.notifications;
drop policy if exists "Users can insert own notifications" on public.notifications;
drop policy if exists "Service role inserts notifications" on public.notifications;
create policy "Service role inserts notifications"
  on public.notifications for insert
  with check (coalesce(auth.jwt() ->> 'role', '') = 'service_role');

-- 4. Pro and Platinum users can run AI assessments
drop policy if exists "Pro users can insert assessments" on public.ai_assessments;
drop policy if exists "Paid users can insert assessments" on public.ai_assessments;
create policy "Paid users can insert assessments"
  on public.ai_assessments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.plan_tier::text in ('pro', 'platinum')
    )
  );

-- 5. Bump engagement when comments are added (requires business platform tables)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'business_post_comments'
  ) then
    create or replace function public.bump_business_post_engagement()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      update public.business_posts
      set
        engagement_score = engagement_score + 1,
        is_trending = (engagement_score + 1) >= 5
      where id = new.post_id;
      return new;
    end;
    $fn$;

    drop trigger if exists business_post_comment_engagement on public.business_post_comments;
    create trigger business_post_comment_engagement
      after insert on public.business_post_comments
      for each row execute function public.bump_business_post_engagement();
  end if;
end $$;

select 'Security hardening migration complete' as status;
