-- Add necessita_inscricao column to agenda_igreja
ALTER TABLE public.agenda_igreja ADD COLUMN necessita_inscricao boolean NOT NULL DEFAULT false;