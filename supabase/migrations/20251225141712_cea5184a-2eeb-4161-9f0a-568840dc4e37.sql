-- Permitir que qualquer usuário possa deletar novos_convertidos
DROP POLICY IF EXISTS "Authenticated users can delete novos_convertidos" ON public.novos_convertidos;
CREATE POLICY "Anyone can delete novos_convertidos" ON public.novos_convertidos FOR DELETE USING (true);

-- Permitir que qualquer usuário possa deletar members
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;
CREATE POLICY "Anyone can delete members" ON public.members FOR DELETE USING (true);