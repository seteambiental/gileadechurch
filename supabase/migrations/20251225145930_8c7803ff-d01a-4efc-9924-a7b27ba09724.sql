-- Permitir INSERT/UPDATE/DELETE para member_functions com anon key (modo bypass)
DROP POLICY IF EXISTS "Authenticated users can insert member_functions" ON public.member_functions;
DROP POLICY IF EXISTS "Authenticated users can update member_functions" ON public.member_functions;
DROP POLICY IF EXISTS "Authenticated users can delete member_functions" ON public.member_functions;

CREATE POLICY "Anyone can insert member_functions"
ON public.member_functions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update member_functions"
ON public.member_functions FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete member_functions"
ON public.member_functions FOR DELETE
USING (true);

-- Também para user_access_requests
DROP POLICY IF EXISTS "Anyone can insert access requests" ON public.user_access_requests;
CREATE POLICY "Anyone can insert access requests"
ON public.user_access_requests FOR INSERT
WITH CHECK (true);