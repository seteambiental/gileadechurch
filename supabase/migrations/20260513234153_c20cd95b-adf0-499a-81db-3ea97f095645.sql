
CREATE OR REPLACE FUNCTION public.generate_impacto_referencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prefixo TEXT;
  ano TEXT;
  seq INT;
  nova_ref TEXT;
BEGIN
  IF NEW.referencia IS NOT NULL AND NEW.referencia != '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(e.prefixo_referencia, ''), 'INSC'),
         EXTRACT(YEAR FROM COALESCE(e.data_inicio, now()))::TEXT
    INTO prefixo, ano
  FROM public.impacto_eventos e
  WHERE e.id = NEW.evento_id;

  IF prefixo IS NULL THEN prefixo := 'INSC'; END IF;
  IF ano IS NULL THEN ano := EXTRACT(YEAR FROM now())::TEXT; END IF;

  -- Global uniqueness: scan all events for the same prefix-year pattern
  SELECT COALESCE(MAX(
    CASE
      WHEN i.referencia ~ ('^' || prefixo || '-[0-9]+-' || ano || '$')
      THEN SPLIT_PART(i.referencia, '-', 2)::INT
      ELSE 0
    END
  ), 0) + 1 INTO seq
  FROM public.impacto_inscricoes i
  WHERE i.referencia IS NOT NULL;

  nova_ref := prefixo || '-' || LPAD(seq::TEXT, 3, '0') || '-' || ano;
  NEW.referencia := nova_ref;
  RETURN NEW;
END;
$function$;

-- Backfill: assign references sequentially across all events for each (prefix, year) bucket
DO $$
DECLARE
  rec RECORD;
  prefixo TEXT;
  ano TEXT;
  start_seq INT;
  next_seq INT;
BEGIN
  FOR rec IN
    SELECT i.id, i.evento_id, i.created_at,
           COALESCE(NULLIF(e.prefixo_referencia, ''), 'INSC') AS pfx,
           EXTRACT(YEAR FROM COALESCE(e.data_inicio, i.created_at, now()))::TEXT AS yr
    FROM public.impacto_inscricoes i
    LEFT JOIN public.impacto_eventos e ON e.id = i.evento_id
    WHERE i.referencia IS NULL OR i.referencia = ''
    ORDER BY i.created_at, i.id
  LOOP
    SELECT COALESCE(MAX(
      CASE
        WHEN ii.referencia ~ ('^' || rec.pfx || '-[0-9]+-' || rec.yr || '$')
        THEN SPLIT_PART(ii.referencia, '-', 2)::INT
        ELSE 0
      END
    ), 0) + 1 INTO next_seq
    FROM public.impacto_inscricoes ii
    WHERE ii.referencia IS NOT NULL;

    UPDATE public.impacto_inscricoes
    SET referencia = rec.pfx || '-' || LPAD(next_seq::TEXT, 3, '0') || '-' || rec.yr
    WHERE id = rec.id;
  END LOOP;
END$$;
