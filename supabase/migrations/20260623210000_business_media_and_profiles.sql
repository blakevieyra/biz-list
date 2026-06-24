-- Business media storage + customer/hiree profile fields

alter table public.profiles
  add column if not exists headline text not null default '',
  add column if not exists skills text[] not null default '{}',
  add column if not exists is_seeking_work boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-media',
  'business-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read business media" on storage.objects;
create policy "Public read business media"
  on storage.objects for select
  using (bucket_id = 'business-media');

drop policy if exists "Users upload own business media" on storage.objects;
create policy "Users upload own business media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own business media" on storage.objects;
create policy "Users update own business media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own business media" on storage.objects;
create policy "Users delete own business media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

select 'Business media and profile fields migration complete' as status;
