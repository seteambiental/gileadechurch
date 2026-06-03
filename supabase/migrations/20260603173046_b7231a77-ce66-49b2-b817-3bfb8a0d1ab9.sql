DROP POLICY IF EXISTS "Casa refugio leaders can update member casa_refugio_id" ON public.members;

CREATE POLICY "Casa refugio leaders can update member casa_refugio_id"
ON public.members
FOR UPDATE
USING (can_manage_casa_refugio(casa_refugio_id) OR (casa_refugio_id IS NULL))
WITH CHECK (can_manage_casa_refugio(casa_refugio_id) OR (casa_refugio_id IS NULL));