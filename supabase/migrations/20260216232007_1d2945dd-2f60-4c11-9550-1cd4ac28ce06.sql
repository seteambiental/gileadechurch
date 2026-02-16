-- Permitir upload de fotos por usuários anônimos (formulário público de cadastro)
DROP POLICY IF EXISTS "Authenticated users can upload member photos" ON storage.objects;

CREATE POLICY "Anyone can upload member photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'member-photos');
