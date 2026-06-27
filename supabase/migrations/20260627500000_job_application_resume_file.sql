-- Allow applicants to attach an uploaded resume file to their job application
alter table public.job_applications
  add column if not exists resume_file_url text;
