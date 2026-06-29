ALTER TABLE public.comunicacao_envios
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_status_code integer,
  ADD COLUMN IF NOT EXISTS provider_response jsonb,
  ADD COLUMN IF NOT EXISTS entregue_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lido_em timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_comunicacao_envios_provider_message_id
  ON public.comunicacao_envios (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comunicacao_envios_delivery_status
  ON public.comunicacao_envios (status, created_at DESC)
  WHERE provider_message_id IS NOT NULL;