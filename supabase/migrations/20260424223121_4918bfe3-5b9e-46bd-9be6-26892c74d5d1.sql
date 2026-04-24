-- Normalize short genero values to canonical lowercase form
UPDATE public.impacto_inscricoes
SET genero = CASE 
  WHEN LOWER(genero) = 'm' THEN 'masculino'
  WHEN LOWER(genero) = 'f' THEN 'feminino'
  ELSE LOWER(genero)
END
WHERE genero IS NOT NULL AND genero != '';

UPDATE public.inscricoes_eventos
SET genero = CASE 
  WHEN LOWER(genero) = 'm' THEN 'masculino'
  WHEN LOWER(genero) = 'f' THEN 'feminino'
  ELSE LOWER(genero)
END
WHERE genero IS NOT NULL AND genero != '';

-- Backfill genero from linked member when missing
UPDATE public.impacto_inscricoes i
SET genero = LOWER(m.genero)
FROM public.members m
WHERE i.member_id = m.id
  AND (i.genero IS NULL OR i.genero = '')
  AND m.genero IS NOT NULL
  AND m.genero != '';

UPDATE public.inscricoes_eventos i
SET genero = LOWER(m.genero)
FROM public.members m
WHERE i.member_id = m.id
  AND (i.genero IS NULL OR i.genero = '')
  AND m.genero IS NOT NULL
  AND m.genero != '';