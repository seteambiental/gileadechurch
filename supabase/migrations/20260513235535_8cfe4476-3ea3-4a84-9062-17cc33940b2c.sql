ALTER TABLE public.impacto_inscricoes DROP CONSTRAINT IF EXISTS impacto_inscricoes_referencia_unique;
ALTER TABLE public.impacto_inscricoes DROP CONSTRAINT IF EXISTS impacto_inscricoes_referencia_key;

CREATE OR REPLACE FUNCTION public.generate_impacto_referencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  grupo TEXT;
  seq INT;
BEGIN
  IF NEW.referencia IS NOT NULL AND NEW.referencia != '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.tipo_inscricao, 'membro') IN ('equipe', 'ministrador', 'familia') THEN
    grupo := 'apoio';
  ELSE
    grupo := 'participante';
  END IF;

  SELECT COALESCE(MAX(
    CASE
      WHEN i.referencia ~ '^[0-9]{3}$' THEN i.referencia::INT
      ELSE 0
    END
  ), 0) + 1
    INTO seq
  FROM public.impacto_inscricoes i
  WHERE i.evento_id = NEW.evento_id
    AND i.referencia IS NOT NULL
    AND (
      (grupo = 'apoio' AND COALESCE(i.tipo_inscricao, 'membro') IN ('equipe', 'ministrador', 'familia'))
      OR
      (grupo = 'participante' AND COALESCE(i.tipo_inscricao, 'membro') NOT IN ('equipe', 'ministrador', 'familia'))
    );

  NEW.referencia := LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$function$;

WITH ranked AS (
  SELECT
    id,
    LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY evento_id,
          CASE WHEN COALESCE(tipo_inscricao, 'membro') IN ('equipe','ministrador','familia')
               THEN 'apoio' ELSE 'participante' END
        ORDER BY lower(coalesce(nome,'')), created_at, id
      )::TEXT, 3, '0'
    ) AS nova_ref
  FROM public.impacto_inscricoes
)
UPDATE public.impacto_inscricoes i
SET referencia = r.nova_ref
FROM ranked r
WHERE i.id = r.id;