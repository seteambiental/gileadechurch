-- Add complement column to casas_refugio table
ALTER TABLE public.casas_refugio ADD COLUMN IF NOT EXISTS complement text;