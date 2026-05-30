ALTER TABLE public.novos_convertidos
  ADD COLUMN IF NOT EXISTS impacto_inscricao_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_novos_convertidos_impacto_inscricao
  ON public.novos_convertidos (impacto_inscricao_id)
  WHERE impacto_inscricao_id IS NOT NULL;