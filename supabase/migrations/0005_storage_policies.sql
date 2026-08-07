-- ============================================================
-- UniNest: Storage bucket policies
-- Run AFTER creating the buckets in the Supabase dashboard
-- (Storage → New bucket):
--   - "verification-documents" — PRIVATE
--   - "listing-photos" — PUBLIC
-- ============================================================

-- verification-documents: a user can only upload into a folder
-- named after their own user id (path = "{their-uid}/filename").
-- This is what makes storage-level access match the RLS policy
-- on the verification_documents table.
create policy "verification_docs_upload_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A user can read their own uploaded files; admins can read all
-- (for reviewing the queue).
create policy "verification_docs_read_own_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'verification-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_admin()
    )
  );

-- listing-photos: public bucket, but only the listing's own landlord
-- can upload into it, scoped to their own folder.
create policy "listing_photos_upload_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can view listing photos (they're meant to be public).
create policy "listing_photos_read_public"
  on storage.objects for select
  using (bucket_id = 'listing-photos');
