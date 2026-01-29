-- Add sindico_id column to condominios table
ALTER TABLE public.condominios 
ADD COLUMN sindico_id uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_condominios_sindico_id ON public.condominios(sindico_id);