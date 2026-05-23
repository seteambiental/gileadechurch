ALTER TABLE public.aniversarios_enviados
  ADD COLUMN IF NOT EXISTS inscricao_evento_id UUID;

CREATE INDEX IF NOT EXISTS idx_aniv_env_inscricao
  ON public.aniversarios_enviados (inscricao_evento_id, data_envio);