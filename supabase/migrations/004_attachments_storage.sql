-- ============================================
-- Task Management App - Attachments Storage
-- Migration 004: Storage bucket + policies for real file uploads
-- ============================================

-- Public bucket so attachment pills can link straight to the file.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Authenticated users can upload files into the attachments bucket.
create policy "attachments_storage_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'attachments');

-- Authenticated users can read files in the attachments bucket
-- (public URLs also work regardless, since the bucket is public).
create policy "attachments_storage_select" on storage.objects
for select to authenticated
using (bucket_id = 'attachments');

-- Uploader or an admin can delete a file, mirroring the attachments table policy.
create policy "attachments_storage_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'attachments'
  and (owner = auth.uid() or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
);
