ALTER TABLE public.homepage_carrossel
ADD COLUMN IF NOT EXISTS posicao_foco text NOT NULL DEFAULT 'center';

COMMENT ON COLUMN public.homepage_carrossel.posicao_foco IS
  'Enquadramento vertical da imagem no carrossel: top, center ou bottom';