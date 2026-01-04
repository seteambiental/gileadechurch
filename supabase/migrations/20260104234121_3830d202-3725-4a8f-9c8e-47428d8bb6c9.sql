-- Permitir INSERT de membros para anon (suporte a bypass) e authenticated
DROP POLICY IF EXISTS "Members insert by authenticated users" ON public.members;

CREATE POLICY "Members insert allowed"
  ON public.members
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);