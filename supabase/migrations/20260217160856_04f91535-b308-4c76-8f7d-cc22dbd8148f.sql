
-- Add valores_por_tipo JSONB to agenda_igreja for differentiated pricing
ALTER TABLE public.agenda_igreja ADD COLUMN IF NOT EXISTS valores_por_tipo jsonb DEFAULT NULL;

-- Add tipo_inscricao and valor_inscricao to inscricoes_eventos
ALTER TABLE public.inscricoes_eventos ADD COLUMN IF NOT EXISTS tipo_inscricao text DEFAULT 'membro';
ALTER TABLE public.inscricoes_eventos ADD COLUMN IF NOT EXISTS valor_inscricao numeric DEFAULT NULL;
