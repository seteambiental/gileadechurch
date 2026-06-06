-- 1) Atualiza a função de geração de referência com trava (advisory lock) por evento+grupo
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

  -- 'familia' counts as participante (individual numbering, only affects pricing)
  IF COALESCE(NEW.tipo_inscricao, 'membro') IN ('equipe', 'ministrador') THEN
    grupo := 'apoio';
  ELSE
    grupo := 'participante';
  END IF;

  -- Serializa a geração de número para o mesmo evento+grupo, evitando colisões
  -- quando duas inscrições são criadas ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.evento_id::text || ':' || grupo));

  SELECT COALESCE(MAX(
    CASE WHEN i.referencia ~ '^[0-9]{3}$' THEN i.referencia::INT ELSE 0 END
  ), 0)
    INTO max_n
  FROM public.impacto_inscricoes i
  WHERE i.evento_id = NEW.evento_id
    AND i.referencia IS NOT NULL
    AND (
      (grupo = 'apoio' AND COALESCE(i.tipo_inscricao, 'membro') IN ('equipe', 'ministrador'))
      OR
      (grupo = 'participante' AND COALESCE(i.tipo_inscricao, 'membro') NOT IN ('equipe', 'ministrador'))
    );

  SELECT g.n INTO seq
  FROM generate_series(1, max_n + 1) AS g(n)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.impacto_inscricoes i
    WHERE i.evento_id = NEW.evento_id
      AND i.referencia ~ '^[0-9]{3}$'
      AND i.referencia::INT = g.n
      AND (
        (grupo = 'apoio' AND COALESCE(i.tipo_inscricao, 'membro') IN ('equipe', 'ministrador'))
        OR
        (grupo = 'participante' AND COALESCE(i.tipo_inscricao, 'membro') NOT IN ('equipe', 'ministrador'))
      )
  )
  ORDER BY g.n
  LIMIT 1;

  NEW.referencia := LPAD(COALESCE(seq, 1)::TEXT, 3, '0');
  RETURN NEW;
END;
$function$;

-- 2) Renumera duplicatas existentes (mantém a inscrição mais antiga do número)
DO $$
DECLARE
  r RECORD;
  v_next INT;
BEGIN
  FOR r IN
    SELECT id, evento_id,
      CASE WHEN COALESCE(tipo_inscricao,'membro') IN ('equipe','ministrador') THEN 'apoio' ELSE 'participante' END AS grupo,
      row_number() OVER (
        PARTITION BY evento_id,
          CASE WHEN COALESCE(tipo_inscricao,'membro') IN ('equipe','ministrador') THEN 'apoio' ELSE 'participante' END,
          referencia
        ORDER BY created_at
      ) AS rn
    FROM public.impacto_inscricoes
    WHERE referencia ~ '^[0-9]{3}$'
    ORDER BY created_at
  LOOP
    IF r.rn > 1 THEN
      SELECT COALESCE(MAX(CASE WHEN referencia ~ '^[0-9]{3}$' THEN referencia::INT ELSE 0 END),0)+1
        INTO v_next
      FROM public.impacto_inscricoes
      WHERE evento_id = r.evento_id
        AND (CASE WHEN COALESCE(tipo_inscricao,'membro') IN ('equipe','ministrador') THEN 'apoio' ELSE 'participante' END) = r.grupo;

      UPDATE public.impacto_inscricoes
      SET referencia = LPAD(v_next::TEXT, 3, '0')
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 3) Proteção definitiva contra números repetidos por evento+grupo
CREATE UNIQUE INDEX IF NOT EXISTS impacto_inscricoes_evento_grupo_ref_uniq
ON public.impacto_inscricoes (
  evento_id,
  (CASE WHEN COALESCE(tipo_inscricao,'membro') IN ('equipe','ministrador') THEN 'apoio' ELSE 'participante' END),
  referencia
)
WHERE referencia ~ '^[0-9]{3}$';