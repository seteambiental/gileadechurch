ALTER TABLE public.casais_despesas
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.casais_turmas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_casais_despesas_turma_id ON public.casais_despesas(turma_id);