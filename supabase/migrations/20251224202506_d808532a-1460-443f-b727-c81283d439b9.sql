-- Adicionar campo de limite de vagas na tabela agenda_igreja
ALTER TABLE public.agenda_igreja 
ADD COLUMN IF NOT EXISTS limite_vagas INTEGER DEFAULT NULL;