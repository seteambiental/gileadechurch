-- Adicionar colunas para variações de logo na tabela igreja_config
ALTER TABLE public.igreja_config
ADD COLUMN IF NOT EXISTS logo_dark_url TEXT,
ADD COLUMN IF NOT EXISTS logo_light_url TEXT,
ADD COLUMN IF NOT EXISTS logo_icon_url TEXT;

-- Criar bucket para logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket de logos
CREATE POLICY "Logos são públicos para visualização"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Usuários autenticados podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');