
-- Add new columns for the enhanced workflow
ALTER TABLE public.sistema_solicitacoes
  ADD COLUMN IF NOT EXISTS imagem_url TEXT,
  ADD COLUMN IF NOT EXISTS resposta_admin TEXT,
  ADD COLUMN IF NOT EXISTS observacao_finalizacao TEXT,
  ADD COLUMN IF NOT EXISTS respondido_por TEXT,
  ADD COLUMN IF NOT EXISTS finalizado_por TEXT,
  ADD COLUMN IF NOT EXISTS respondido_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ;

-- Create storage bucket for request images
INSERT INTO storage.buckets (id, name, public)
VALUES ('sistema-solicitacoes', 'sistema-solicitacoes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload sistema images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sistema-solicitacoes');

-- Allow public read access
CREATE POLICY "Public read sistema images"
ON storage.objects FOR SELECT
USING (bucket_id = 'sistema-solicitacoes');

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete sistema images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sistema-solicitacoes');
