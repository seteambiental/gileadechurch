-- Add separate member ID columns for leaders and hosts
ALTER TABLE public.casas_refugio 
ADD COLUMN IF NOT EXISTS lider_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lider_esposa_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS anfitriao_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS anfitriao_esposa_id uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_casas_refugio_lider_id ON public.casas_refugio(lider_id);
CREATE INDEX IF NOT EXISTS idx_casas_refugio_lider_esposa_id ON public.casas_refugio(lider_esposa_id);
CREATE INDEX IF NOT EXISTS idx_casas_refugio_anfitriao_id ON public.casas_refugio(anfitriao_id);
CREATE INDEX IF NOT EXISTS idx_casas_refugio_anfitriao_esposa_id ON public.casas_refugio(anfitriao_esposa_id);