-- Add resume_url to profiles for job seekers who upload a file instead of pasting a URL
alter table public.profiles
  add column if not exists resume_url text;
