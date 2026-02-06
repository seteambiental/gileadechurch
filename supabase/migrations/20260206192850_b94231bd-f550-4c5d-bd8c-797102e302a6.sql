-- Add data_inicio_cr column to casas_refugio table
ALTER TABLE public.casas_refugio
ADD COLUMN data_inicio_cr date NULL;