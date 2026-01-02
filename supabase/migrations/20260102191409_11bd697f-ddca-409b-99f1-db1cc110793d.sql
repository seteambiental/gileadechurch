-- Add arquivado field to testemunhos
ALTER TABLE public.testemunhos 
ADD COLUMN arquivado BOOLEAN NOT NULL DEFAULT false;

-- Add arquivado_em field
ALTER TABLE public.testemunhos 
ADD COLUMN arquivado_em TIMESTAMP WITH TIME ZONE;