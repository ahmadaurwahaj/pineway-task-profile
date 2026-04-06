-- Create avatars bucket if it doesn't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, '{"image/jpeg","image/jpg","image/png","image/webp"}')
on conflict (id) do nothing;

-- Drop old policies (from 0001 or manually created) to avoid conflicts
drop policy if exists "Anyone can view avatar files" on storage.objects;
drop policy if exists "Authenticated users can upload avatar files" on storage.objects;
drop policy if exists "Users can update their own avatar files" on storage.objects;
drop policy if exists "Users can delete their own avatar files" on storage.objects;
drop policy if exists "allow_all 1oj01fe_0" on storage.objects;
drop policy if exists "allow_all 1oj01fe_1" on storage.objects;

-- SELECT: anyone (anon + authenticated) can view avatars
create policy "avatars_select"
on storage.objects
for select
to authenticated, anon
using (bucket_id = 'avatars');

-- INSERT: authenticated users can upload
create policy "avatars_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars');

-- UPDATE: authenticated users can update their own files
create policy "avatars_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

-- DELETE: authenticated users can delete their own files
create policy "avatars_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars');
