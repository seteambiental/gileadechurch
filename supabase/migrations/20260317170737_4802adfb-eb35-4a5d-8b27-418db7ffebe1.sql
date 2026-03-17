
CREATE OR REPLACE FUNCTION public.is_lider_casa_refugio()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('lider_casa_refugio', 'secretario_casa_refugio')
  )
$function$;
