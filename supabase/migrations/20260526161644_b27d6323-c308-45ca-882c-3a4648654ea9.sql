DROP POLICY IF EXISTS "Anon can read inserted registration response" ON public.inscricoes_eventos;

CREATE POLICY "Anon can read inserted registration response"
ON public.inscricoes_eventos
FOR SELECT
TO anon
USING (current_setting('request.method', true) = 'POST');