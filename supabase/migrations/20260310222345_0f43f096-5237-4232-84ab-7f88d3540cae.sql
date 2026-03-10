-- Move the orphan inscription from the duplicate event to the correct one
UPDATE public.impacto_inscricoes 
SET evento_id = 'bee5a962-2cb7-47c7-9721-561e95cdc771' 
WHERE id = 'fd477c33-c71e-4f65-83b1-e8c595c58a83' 
  AND evento_id = '5c7e584a-4b6b-4c41-b808-cacf7b937234';

-- Delete the duplicate impacto_eventos record
DELETE FROM public.impacto_eventos 
WHERE id = '5c7e584a-4b6b-4c41-b808-cacf7b937234';

-- Add a unique constraint on titulo to prevent future duplicates
ALTER TABLE public.impacto_eventos ADD CONSTRAINT unique_impacto_evento_titulo UNIQUE (titulo);