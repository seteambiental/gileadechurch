-- Add casa_refugio_id column to members table
ALTER TABLE public.members 
ADD COLUMN casa_refugio_id uuid REFERENCES public.casas_refugio(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_members_casa_refugio_id ON public.members(casa_refugio_id);