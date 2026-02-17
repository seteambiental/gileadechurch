ALTER TABLE public.impacto_eventos ADD COLUMN tem_custo boolean DEFAULT false;
ALTER TABLE public.impacto_eventos ADD COLUMN valores_por_tipo jsonb DEFAULT '{}'::jsonb;