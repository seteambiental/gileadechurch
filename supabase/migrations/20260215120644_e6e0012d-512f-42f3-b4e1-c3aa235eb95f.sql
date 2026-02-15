-- Fix storage security: Remove anon write access to member-photos
DROP POLICY IF EXISTS "Anon users can upload member photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can delete member photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can update member photos" ON storage.objects;

-- Drop existing authenticated policies to avoid conflict
DROP POLICY IF EXISTS "Authenticated users can upload member photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete member photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update member photos" ON storage.objects;

-- Add authenticated-only upload policy for member-photos
CREATE POLICY "Authenticated users can upload member photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'member-photos');

-- Add authenticated-only delete policy for member-photos  
CREATE POLICY "Authenticated users can delete member photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'member-photos');

-- Add authenticated-only update policy for member-photos
CREATE POLICY "Authenticated users can update member photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'member-photos');