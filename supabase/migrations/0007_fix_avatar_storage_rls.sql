-- Fix avatar storage RLS policies to enforce per-user folder isolation.
-- Files are stored as {userId}/{timestamp}.{ext}, so we use foldername(name)[1]
-- to verify the authenticated user owns the folder.

-- Drop the permissive policies created in 0003
drop policy if exists "avatars_select" on storage.objects;
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;

-- SELECT: anyone can view avatars (public bucket)
create policy "avatars_select"
on storage.objects
for select
to authenticated, anon
using (bucket_id = 'avatars');

-- INSERT: authenticated users can upload only to their own folder
create policy "avatars_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: authenticated users can update only their own files
create policy "avatars_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: authenticated users can delete only their own files
create policy "avatars_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
