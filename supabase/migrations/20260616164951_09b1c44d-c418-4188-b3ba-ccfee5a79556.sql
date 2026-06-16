ALTER TABLE public.comunicacao_envios
  ADD COLUMN IF NOT EXISTS confirmacao_solicitada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmado_em timestamptz,
  ADD COLUMN IF NOT EXISTS confirmacao_resposta text;

ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS pedir_confirmacao boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_comunicacao_envios_confirmacao
  ON public.comunicacao_envios (destinatario_telefone, confirmado_em)
  WHERE confirmacao_solicitada = true;