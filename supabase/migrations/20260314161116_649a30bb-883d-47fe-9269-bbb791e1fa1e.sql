
INSERT INTO storage.buckets (id, name, public)
VALUES ('db-backups', 'db-backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Service role full access on db-backups"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'db-backups')
WITH CHECK (bucket_id = 'db-backups');
