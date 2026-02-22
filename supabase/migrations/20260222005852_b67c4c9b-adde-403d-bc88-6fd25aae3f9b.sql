CREATE OR REPLACE FUNCTION public.get_members_count()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*) FROM public.members WHERE excluido IS NOT TRUE;
$function$;