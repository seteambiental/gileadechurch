CREATE OR REPLACE FUNCTION public.sync_casa_refugio_anfitriao_functions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' OR OLD.anfitriao_id IS DISTINCT FROM NEW.anfitriao_id) THEN
    IF TG_OP = 'UPDATE' AND OLD.anfitriao_id IS NOT NULL AND OLD.anfitriao_id IS DISTINCT FROM NEW.anfitriao_id THEN
      DELETE FROM member_functions
      WHERE member_id = OLD.anfitriao_id
        AND function_type = 'anfitriao_casa_refugio'
        AND casa_refugio_id = NEW.id;
    END IF;
    IF NEW.anfitriao_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
      VALUES (NEW.anfitriao_id, 'anfitriao_casa_refugio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR OLD.anfitriao_esposa_id IS DISTINCT FROM NEW.anfitriao_esposa_id) THEN
    IF TG_OP = 'UPDATE' AND OLD.anfitriao_esposa_id IS NOT NULL AND OLD.anfitriao_esposa_id IS DISTINCT FROM NEW.anfitriao_esposa_id THEN
      DELETE FROM member_functions
      WHERE member_id = OLD.anfitriao_esposa_id
        AND function_type = 'anfitriao_casa_refugio'
        AND casa_refugio_id = NEW.id;
    END IF;
    IF NEW.anfitriao_esposa_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
      VALUES (NEW.anfitriao_esposa_id, 'anfitriao_casa_refugio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_casa_refugio_anfitriao ON public.casas_refugio;
CREATE TRIGGER trg_sync_casa_refugio_anfitriao
  AFTER INSERT OR UPDATE ON public.casas_refugio
  FOR EACH ROW EXECUTE FUNCTION public.sync_casa_refugio_anfitriao_functions();

INSERT INTO public.member_functions (member_id, function_type, casa_refugio_id)
SELECT anfitriao_id, 'anfitriao_casa_refugio'::church_function_type, id FROM public.casas_refugio WHERE anfitriao_id IS NOT NULL
UNION
SELECT anfitriao_esposa_id, 'anfitriao_casa_refugio'::church_function_type, id FROM public.casas_refugio WHERE anfitriao_esposa_id IS NOT NULL
ON CONFLICT DO NOTHING;