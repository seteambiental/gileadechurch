ALTER TABLE public.impacto_inscricoes
  ADD COLUMN IF NOT EXISTS converteu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconciliou boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_impacto_inscricoes_converteu
  ON public.impacto_inscricoes (evento_id) WHERE converteu = true;

CREATE INDEX IF NOT EXISTS idx_impacto_inscricoes_reconciliou
  ON public.impacto_inscricoes (evento_id) WHERE reconciliou = true;