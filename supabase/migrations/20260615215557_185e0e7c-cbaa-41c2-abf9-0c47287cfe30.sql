ALTER TABLE public.aniversarios_enviados
  ADD COLUMN IF NOT EXISTS resposta_provedor text,
  ADD COLUMN IF NOT EXISTS message_id text;