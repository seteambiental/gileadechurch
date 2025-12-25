-- Permitir que qualquer usuário autenticado ou anon visualize as solicitações
DROP POLICY IF EXISTS "Masters can view and manage access requests" ON public.user_access_requests;

CREATE POLICY "Anyone can view access requests"
ON public.user_access_requests FOR SELECT
USING (true);

-- Permitir que qualquer um possa atualizar (para aprovar/rejeitar)
DROP POLICY IF EXISTS "Masters can update access requests" ON public.user_access_requests;

CREATE POLICY "Anyone can update access requests"
ON public.user_access_requests FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permitir que qualquer um possa deletar
DROP POLICY IF EXISTS "Masters can delete access requests" ON public.user_access_requests;

CREATE POLICY "Anyone can delete access requests"
ON public.user_access_requests FOR DELETE
USING (true);