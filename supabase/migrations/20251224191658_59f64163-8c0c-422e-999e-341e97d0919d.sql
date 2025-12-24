-- Adicionar campos para refeição, custo e horários múltiplos
ALTER TABLE public.agenda_igreja 
ADD COLUMN IF NOT EXISTS tem_refeicao boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS comentarios_refeicao text,
ADD COLUMN IF NOT EXISTS tem_custo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS valor_custo numeric,
ADD COLUMN IF NOT EXISTS comentarios_custo text,
ADD COLUMN IF NOT EXISTS horarios_por_dia jsonb DEFAULT '[]'::jsonb;