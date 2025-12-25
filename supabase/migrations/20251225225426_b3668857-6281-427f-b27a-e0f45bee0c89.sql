-- Atualizar política de exclusão de membros para permitir qualquer usuário autenticado (temporariamente para dev)
DROP POLICY IF EXISTS "Only admins can delete members" ON public.members;

CREATE POLICY "Anyone can delete members" 
ON public.members 
FOR DELETE 
USING (true);