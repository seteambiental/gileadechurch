
CREATE OR REPLACE FUNCTION public.can_manage_casa_refugio(casa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    has_full_access()
    OR EXISTS (
      SELECT 1 FROM public.member_functions mf
      INNER JOIN public.members m ON m.id = mf.member_id
      WHERE m.user_id = auth.uid()
        AND mf.casa_refugio_id = casa_id
        AND mf.function_type IN ('lider_casa_refugio', 'supervisor_casa_refugio', 'secretario_casa_refugio')
    )
    OR EXISTS (
      SELECT 1 FROM public.casas_refugio cr
      INNER JOIN public.members m ON m.user_id = auth.uid()
      WHERE cr.id = casa_id
        AND (cr.lider_id = m.id OR cr.lider_esposa_id = m.id 
             OR cr.supervisor_id = m.id OR cr.supervisor_esposa_id = m.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.casas_refugio cr
      INNER JOIN public.condominios c ON c.name = cr.condominio
      INNER JOIN public.members m ON m.user_id = auth.uid()
      WHERE cr.id = casa_id
        AND (c.sindico_id = m.id OR c.sindico_esposa_id = m.id)
    )
$$;
