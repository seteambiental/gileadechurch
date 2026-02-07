
-- Add columns to track if meeting happened and justification
ALTER TABLE public.encontros_casa_refugio 
ADD COLUMN reuniao_realizada boolean NOT NULL DEFAULT true,
ADD COLUMN justificativa text;
