-- Adicionar colunas para segunda versão das logos
ALTER TABLE public.igreja_config
ADD COLUMN IF NOT EXISTS logo_dark_url_2 TEXT,
ADD COLUMN IF NOT EXISTS logo_light_url_2 TEXT;