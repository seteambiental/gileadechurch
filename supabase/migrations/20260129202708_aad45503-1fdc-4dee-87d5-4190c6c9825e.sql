-- Add leader fields to ministries table
ALTER TABLE public.ministries
ADD COLUMN lider_id uuid REFERENCES public.members(id),
ADD COLUMN lider_esposa_id uuid REFERENCES public.members(id);

-- Add spouse field to condominios table
ALTER TABLE public.condominios
ADD COLUMN sindico_esposa_id uuid REFERENCES public.members(id);