GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes_eventos TO authenticated;
GRANT INSERT ON public.inscricoes_eventos TO anon;
GRANT ALL ON public.inscricoes_eventos TO service_role;