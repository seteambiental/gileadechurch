ALTER TABLE public.homepage_carrossel
ADD COLUMN IF NOT EXISTS imagem_largura integer,
ADD COLUMN IF NOT EXISTS imagem_altura integer;