CREATE POLICY "Kids team can view novos_convertidos"
ON public.novos_convertidos
FOR SELECT
TO authenticated
USING (public.can_access_kids_data());