-- Adicionar colunas de coordenadas para o mapa
ALTER TABLE public.casas_refugio 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;