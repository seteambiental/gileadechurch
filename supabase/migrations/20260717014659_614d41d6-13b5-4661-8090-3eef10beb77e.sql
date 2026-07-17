ALTER TABLE public.casais_turmas ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_casais_turmas_arquivada ON public.casais_turmas(arquivada);