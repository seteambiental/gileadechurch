
-- Add local type and ambiente reference to agenda_igreja
ALTER TABLE public.agenda_igreja 
  ADD COLUMN local_tipo text NOT NULL DEFAULT 'na_igreja',
  ADD COLUMN ambiente_id uuid REFERENCES public.ambientes(id),
  ADD COLUMN bloqueio_inicio timestamp with time zone,
  ADD COLUMN bloqueio_fim timestamp with time zone;

-- Create index for ambiente lookups
CREATE INDEX idx_agenda_igreja_ambiente_id ON public.agenda_igreja(ambiente_id);
