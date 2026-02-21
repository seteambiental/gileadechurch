ALTER TABLE public.casais_turmas 
ADD COLUMN IF NOT EXISTS dia_semana text,
ADD COLUMN IF NOT EXISTS horario_inicio text,
ADD COLUMN IF NOT EXISTS horario_fim text;