-- Add sub-team column for Jovens/Adultos (Time 1, Time 2, Time 3)
ALTER TABLE public.danca_equipe_membros 
ADD COLUMN sub_time text;

-- Add comment to explain the column
COMMENT ON COLUMN public.danca_equipe_membros.sub_time IS 'Sub-time dentro de Jovens/Adultos: Time 1, Time 2, Time 3';