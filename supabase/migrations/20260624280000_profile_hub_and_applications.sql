-- Profile preferences: follow digest + job seeker fields
alter table public.profiles
  add column if not exists follow_digest_frequency text not null default 'none'
    check (follow_digest_frequency in ('none', 'daily', 'weekly', 'monthly'));

alter table public.profiles
  add column if not exists job_alert_opt_in boolean not null default false;

alter table public.profiles
  add column if not exists experience_text text not null default '';

alter table public.profiles
  add column if not exists resume_text text not null default '';

alter table public.profiles
  add column if not exists target_job_titles text[] not null default '{}';

-- Richer job applications (one per user per business)
alter table public.job_applications
  add column if not exists cover_letter text not null default '';

alter table public.job_applications
  add column if not exists resume_snapshot text not null default '';

-- Application discussion threads
create table if not exists public.job_application_comments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_application_comments_app
  on public.job_application_comments (application_id, created_at);

alter table public.job_application_comments enable row level security;

drop policy if exists "Application comments visible to applicant and owner" on public.job_application_comments;
create policy "Application comments visible to applicant and owner"
  on public.job_application_comments for select using (
    exists (
      select 1 from public.job_applications ja
      join public.businesses b on b.id = ja.business_id
      where ja.id = application_id
        and (ja.applicant_id = auth.uid() or b.owner_id = auth.uid())
    )
  );

drop policy if exists "Applicant and owner can comment on applications" on public.job_application_comments;
create policy "Applicant and owner can comment on applications"
  on public.job_application_comments for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.job_applications ja
      join public.businesses b on b.id = ja.business_id
      where ja.id = application_id
        and (ja.applicant_id = auth.uid() or b.owner_id = auth.uid())
    )
  );
