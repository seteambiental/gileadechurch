ALTER TABLE public.inscricoes_eventos 
ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS aprovado_por text;