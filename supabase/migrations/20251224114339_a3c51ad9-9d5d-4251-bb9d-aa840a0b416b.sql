-- Add new columns to casas_refugio table
ALTER TABLE public.casas_refugio
ADD COLUMN IF NOT EXISTS anfitrioes text,
ADD COLUMN IF NOT EXISTS condominio text,
ADD COLUMN IF NOT EXISTS lideres text,
ADD COLUMN IF NOT EXISTS supervisores text,
ADD COLUMN IF NOT EXISTS dias text,
ADD COLUMN IF NOT EXISTS frequencia text,
ADD COLUMN IF NOT EXISTS numero text;