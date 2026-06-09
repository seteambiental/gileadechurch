CREATE POLICY "Admins can read db-backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'db-backups'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pastor_geral'))
);