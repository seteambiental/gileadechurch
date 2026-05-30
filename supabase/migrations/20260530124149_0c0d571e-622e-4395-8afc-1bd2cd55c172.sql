ALTER TABLE public.impacto_inscricoes
  ADD COLUMN IF NOT EXISTS virou_membro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS membro_convertido_id uuid REFERENCES public.members(id);

CREATE INDEX IF NOT EXISTS idx_impacto_inscricoes_virou_membro
  ON public.impacto_inscricoes (virou_membro);