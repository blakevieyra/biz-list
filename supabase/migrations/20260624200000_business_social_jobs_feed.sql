-- Social profiles, service links, job applications, community feed scope

alter table public.businesses
  add column if not exists social_links jsonb not null default '{}';

alter table public.profiles
  add column if not exists feed_scope text not null default 'local'
    check (feed_scope in ('local', 'state', 'nationwide'));

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (business_id, applicant_id)
);

create index if not exists idx_job_applications_business on public.job_applications (business_id);
create index if not exists idx_job_applications_applicant on public.job_applications (applicant_id);
create index if not exists idx_profiles_feed_scope on public.profiles (feed_scope, state, city);

alter table public.job_applications enable row level security;

drop policy if exists "Job applications visible to applicant and owner" on public.job_applications;
create policy "Job applications visible to applicant and owner"
  on public.job_applications for select using (
    auth.uid() = applicant_id
    or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "Customers can apply for jobs" on public.job_applications;
create policy "Customers can apply for jobs"
  on public.job_applications for insert with check (
    auth.uid() = applicant_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'customer'
    )
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.is_hiring = true
    )
  );

drop policy if exists "Business owners can update application status" on public.job_applications;
create policy "Business owners can update application status"
  on public.job_applications for update using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- Pro/Platinum posts start with a visibility boost; likes also bump engagement
create or replace function public.bump_business_post_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  boost int := 1;
  owner_plan text;
begin
  select p.plan_tier::text into owner_plan
  from public.business_posts bp
  join public.businesses b on b.id = bp.business_id
  join public.profiles p on p.id = b.owner_id
  where bp.id = new.post_id;

  if owner_plan in ('pro', 'platinum') then
    boost := 2;
  end if;

  update public.business_posts
  set
    engagement_score = engagement_score + boost,
    is_trending = (engagement_score + boost) >= 5
      or (owner_plan in ('pro', 'platinum') and (engagement_score + boost) >= 3)
  where id = new.post_id;

  return new;
end;
$$;

drop trigger if exists business_post_comment_engagement on public.business_post_comments;
create trigger business_post_comment_engagement
  after insert on public.business_post_comments
  for each row execute function public.bump_business_post_engagement();

-- Likes bump engagement on business posts (via business profile visibility)
create or replace function public.bump_business_like_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  boost int := 1;
  owner_plan text;
begin
  select p.plan_tier::text into owner_plan
  from public.businesses b
  join public.profiles p on p.id = b.owner_id
  where b.id = new.business_id;

  if owner_plan in ('pro', 'platinum') then
    boost := 2;
  end if;

  update public.business_posts
  set
    engagement_score = engagement_score + boost,
    is_trending = engagement_score + boost >= 5
      or (owner_plan in ('pro', 'platinum') and engagement_score + boost >= 3)
  where business_id = new.business_id
    and created_at >= now() - interval '30 days';

  return new;
end;
$$;

drop trigger if exists business_like_engagement on public.business_likes;
create trigger business_like_engagement
  after insert on public.business_likes
  for each row execute function public.bump_business_like_engagement();

select 'Business social, jobs, and feed scope migration complete' as status;
