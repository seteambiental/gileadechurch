ALTER TABLE public.impacto_eventos ADD COLUMN IF NOT EXISTS campos_formulario jsonb DEFAULT NULL;
ALTER TABLE public.agenda_igreja ADD COLUMN IF NOT EXISTS campos_formulario jsonb DEFAULT NULL;