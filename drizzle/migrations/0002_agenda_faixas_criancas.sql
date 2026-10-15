ALTER TABLE public.agenda_igreja ADD COLUMN IF NOT EXISTS aceita_criancas boolean NOT NULL DEFAULT false;
ALTER TABLE public.agenda_igreja ADD COLUMN IF NOT EXISTS faixas_criancas jsonb;