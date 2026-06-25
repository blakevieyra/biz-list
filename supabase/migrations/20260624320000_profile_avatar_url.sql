-- Optional profile photo for members (shown on comments, directory, etc.)

alter table public.profiles
  add column if not exists avatar_url text;
