-- Business-configured job application questions and applicant answers
alter table public.businesses
  add column if not exists job_application_form jsonb not null default '{"questions":[]}'::jsonb;

alter table public.job_applications
  add column if not exists form_answers jsonb not null default '{}'::jsonb;

alter table public.job_applications
  add column if not exists resume_attached boolean not null default false;
