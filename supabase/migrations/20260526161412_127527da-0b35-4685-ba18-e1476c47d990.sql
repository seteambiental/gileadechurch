GRANT INSERT ON public.inscricoes_eventos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes_eventos TO authenticated;
GRANT ALL ON public.inscricoes_eventos TO service_role;

DROP POLICY IF EXISTS "Anyone can insert inscricoes" ON public.inscricoes_eventos;

CREATE POLICY "Anyone can insert inscricoes"
ON public.inscricoes_eventos
FOR INSERT
TO anon, authenticated
WITH CHECK (
  evento_id IS NOT NULL
  AND nome_participante IS NOT NULL
  AND length(trim(nome_participante)) > 0
);