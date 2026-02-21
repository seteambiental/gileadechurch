CREATE OR REPLACE FUNCTION public.get_members_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*) FROM public.members;
$$;