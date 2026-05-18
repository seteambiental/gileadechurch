CREATE OR REPLACE FUNCTION public.generate_impacto_referencia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  grupo TEXT;
  seq INT;
  max_n INT;
BEGIN
  IF NEW.referencia IS NOT NULL AND NEW.referencia != '' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.tipo_inscricao, 'membro') IN ('equipe', 'ministrador', 'familia') THEN
    grupo := 'apoio';
  ELSE
    grupo := 'participante';
  END IF;

  -- Find the highest used number for the group
  SELECT COALESCE(MAX(
    CASE WHEN i.referencia ~ '^[0-9]{3}$' THEN i.referencia::INT ELSE 0 END
  ), 0)
    INTO max_n
  FROM public.impacto_inscricoes i
  WHERE i.evento_id = NEW.evento_id
    AND i.referencia IS NOT NULL
    AND (
      (grupo = 'apoio' AND COALESCE(i.tipo_inscricao, 'membro') IN ('equipe', 'ministrador', 'familia'))
      OR
      (grupo = 'participante' AND COALESCE(i.tipo_inscricao, 'membro') NOT IN ('equipe', 'ministrador', 'familia'))
    );

  -- Find the lowest unused number (fills gaps left by deleted entries)
  SELECT g.n INTO seq
  FROM generate_series(1, max_n + 1) AS g(n)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.impacto_inscricoes i
    WHERE i.evento_id = NEW.evento_id
      AND i.referencia ~ '^[0-9]{3}$'
      AND i.referencia::INT = g.n
      AND (
        (grupo = 'apoio' AND COALESCE(i.tipo_inscricao, 'membro') IN ('equipe', 'ministrador', 'familia'))
        OR
        (grupo = 'participante' AND COALESCE(i.tipo_inscricao, 'membro') NOT IN ('equipe', 'ministrador', 'familia'))
      )
  )
  ORDER BY g.n
  LIMIT 1;

  NEW.referencia := LPAD(COALESCE(seq, 1)::TEXT, 3, '0');
  RETURN NEW;
END;
$function$;