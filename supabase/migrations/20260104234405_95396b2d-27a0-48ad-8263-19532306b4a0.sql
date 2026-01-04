-- Reforçar segurança da tabela members (remoção de INSERT público)
-- O cadastro de membros contém dados pessoais (PII) e não deve ser inserido por anon.

DROP POLICY IF EXISTS "Members insert allowed" ON public.members;

-- Permitir leitura apenas para usuários autenticados
DROP POLICY IF EXISTS "Members read for authenticated" ON public.members;
CREATE POLICY "Members read for authenticated"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Permitir INSERT/UPDATE/DELETE apenas para admin/master
DROP POLICY IF EXISTS "Members insert by authenticated users" ON public.members;
DROP POLICY IF EXISTS "Members insert by admin or master" ON public.members;
CREATE POLICY "Members insert by admin or master"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_master());

DROP POLICY IF EXISTS "Members update by admin or master" ON public.members;
CREATE POLICY "Members update by admin or master"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_master())
  WITH CHECK (is_admin() OR is_master());

DROP POLICY IF EXISTS "Members delete by admin or master" ON public.members;
CREATE POLICY "Members delete by admin or master"
  ON public.members
  FOR DELETE
  TO authenticated
  USING (is_admin() OR is_master());