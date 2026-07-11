ALTER TABLE public.apresentacao_criancas
  ADD COLUMN IF NOT EXISTS data_apresentacao date,
  ADD COLUMN IF NOT EXISTS certificado_emitido boolean NOT NULL DEFAULT false;