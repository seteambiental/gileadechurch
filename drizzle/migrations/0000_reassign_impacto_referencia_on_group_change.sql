CREATE OR REPLACE FUNCTION public.reassign_impacto_referencia_on_group_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_grupo TEXT;
  new_grupo TEXT;
  seq INT;
  max_n INT;
BEGIN
  IF COALESCE(OLD.tipo_inscricao,'membro') = COALESCE(NEW.tipo_inscricao,'membro') THEN
    RETURN NEW;
  END IF;

  old_grupo := CASE WHEN COALESCE(OLD.tipo_inscricao,'membro') IN ('equipe','ministrador') THEN 'apoio' ELSE 'participante' END;
  new_grupo := CASE WHEN COALESCE(NEW.tipo_inscricao,'membro') IN ('equipe','ministrador') THEN 'apoio' ELSE 'participante' END;

  IF old_grupo = new_grupo THEN
    RETURN NEW;
  END IF;

  IF NEW.referencia IS NULL OR NEW.referencia !~ '^[0-9]{3}$' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.evento_id::text || ':' || new_grupo));

  SELECT COALESCE(MAX(CASE WHEN i.referencia ~ '^[0-9]{3}$' THEN i.referencia::INT ELSE 0 END), 0)
    INTO max_n
  FROM public.impacto_inscricoes i
  WHERE i.evento_id = NEW.evento_id
    AND i.id <> NEW.id
    AND (
      (new_grupo = 'apoio' AND COALESCE(i.tipo_inscricao,'membro') IN ('equipe','ministrador'))
      OR (new_grupo = 'participante' AND COALESCE(i.tipo_inscricao,'membro') NOT IN ('equipe','ministrador'))
    );

  SELECT g.n INTO seq
  FROM generate_series(1, max_n + 1) AS g(n)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.impacto_inscricoes i
    WHERE i.evento_id = NEW.evento_id
      AND i.id <> NEW.id
      AND i.referencia ~ '^[0-9]{3}$'
      AND i.referencia::INT = g.n
      AND (
        (new_grupo = 'apoio' AND COALESCE(i.tipo_inscricao,'membro') IN ('equipe','ministrador'))
        OR (new_grupo = 'participante' AND COALESCE(i.tipo_inscricao,'membro') NOT IN ('equipe','ministrador'))
      )
  )
  ORDER BY g.n
  LIMIT 1;

  NEW.referencia := LPAD(COALESCE(seq, 1)::TEXT, 3, '0');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reassign_impacto_referencia ON public.impacto_inscricoes;

CREATE TRIGGER trg_reassign_impacto_referencia
BEFORE UPDATE OF tipo_inscricao ON public.impacto_inscricoes
FOR EACH ROW
EXECUTE FUNCTION public.reassign_impacto_referencia_on_group_change();