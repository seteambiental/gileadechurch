-- Add field for ministry interest in members table
ALTER TABLE public.members
ADD COLUMN ministerios_interesse uuid[] DEFAULT '{}',
ADD COLUMN nao_pretende_servir boolean DEFAULT false;