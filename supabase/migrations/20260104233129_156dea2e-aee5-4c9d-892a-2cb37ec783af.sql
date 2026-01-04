-- Corrigir política de INSERT para members
-- Permitir que qualquer usuário autenticado possa inserir membros

DROP POLICY IF EXISTS "Members insert by admin or master" ON public.members;

CREATE POLICY "Members insert by authenticated users"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);