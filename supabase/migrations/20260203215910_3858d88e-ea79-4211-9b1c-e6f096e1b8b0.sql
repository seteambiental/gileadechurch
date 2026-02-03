-- Add separate offering fields for dinheiro and pix to encontros_casa_refugio
ALTER TABLE public.encontros_casa_refugio
ADD COLUMN ofertas_dinheiro numeric DEFAULT 0,
ADD COLUMN ofertas_pix numeric DEFAULT 0;

-- Copy existing ofertas to ofertas_dinheiro for backward compatibility
UPDATE public.encontros_casa_refugio
SET ofertas_dinheiro = COALESCE(ofertas, 0)
WHERE ofertas > 0;