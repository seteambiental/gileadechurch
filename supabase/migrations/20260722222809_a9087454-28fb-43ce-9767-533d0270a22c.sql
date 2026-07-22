ALTER TABLE public.casais_turmas
  ADD COLUMN IF NOT EXISTS valor_curso numeric NOT NULL DEFAULT 140;

UPDATE public.casais_turmas
  SET valor_curso = 100
  WHERE created_at < now();
