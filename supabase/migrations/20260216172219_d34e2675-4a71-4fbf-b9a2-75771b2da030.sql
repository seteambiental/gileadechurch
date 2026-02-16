ALTER TABLE public.inscricoes_eventos 
ADD COLUMN IF NOT EXISTS igreja_congrega text,
ADD COLUMN IF NOT EXISTS ministerio_igreja text;