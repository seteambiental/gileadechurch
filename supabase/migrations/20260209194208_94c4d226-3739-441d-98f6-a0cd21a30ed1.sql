
-- Add data_esperada column to track the original expected date when a meeting date is changed
ALTER TABLE public.encontros_casa_refugio 
ADD COLUMN data_esperada date;

-- For existing records, default data_esperada to data_encontro
UPDATE public.encontros_casa_refugio 
SET data_esperada = data_encontro 
WHERE data_esperada IS NULL;
