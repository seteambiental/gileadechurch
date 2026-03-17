
DROP POLICY "Anyone can insert jiujitsu_inscricoes" ON public.jiujitsu_inscricoes;
CREATE POLICY "Anyone can insert jiujitsu_inscricoes" ON public.jiujitsu_inscricoes FOR INSERT TO anon, authenticated WITH CHECK (true);
