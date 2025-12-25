-- Reverter políticas inseguras de DELETE (não permitir exclusão pública)
DROP POLICY IF EXISTS "Anyone can delete novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Anyone can delete members" ON public.members;

-- Recriar políticas de DELETE para autenticados (sem IF NOT EXISTS)
DROP POLICY IF EXISTS "Authenticated users can delete novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;

CREATE POLICY "Authenticated users can delete novos_convertidos"
ON public.novos_convertidos
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete members"
ON public.members
FOR DELETE
TO authenticated
USING (true);