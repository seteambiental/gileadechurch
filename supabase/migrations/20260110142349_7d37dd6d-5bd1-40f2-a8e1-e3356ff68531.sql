-- Adicionar campos de latitude e longitude para a igreja
ALTER TABLE public.igreja_config 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;