-- Permitir anon fazer upload no bucket member-photos
CREATE POLICY "Anon users can upload member photos" 
ON storage.objects 
FOR INSERT 
TO anon
WITH CHECK (bucket_id = 'member-photos');

-- Permitir anon fazer update no bucket member-photos
CREATE POLICY "Anon users can update member photos" 
ON storage.objects 
FOR UPDATE 
TO anon
USING (bucket_id = 'member-photos')
WITH CHECK (bucket_id = 'member-photos');

-- Permitir anon fazer delete no bucket member-photos
CREATE POLICY "Anon users can delete member photos" 
ON storage.objects 
FOR DELETE 
TO anon
USING (bucket_id = 'member-photos');