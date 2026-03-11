-- Allow anonymous INSERT on casais_inscritos (public form)
DROP POLICY IF EXISTS "Authenticated users can insert casais_inscritos" ON public.casais_inscritos;
CREATE POLICY "Anyone can insert casais_inscritos" ON public.casais_inscritos FOR INSERT WITH CHECK (true);

-- Allow anonymous INSERT on casais_inscritos_filhos (public form)
DROP POLICY IF EXISTS "Authenticated users can insert casais_inscritos_filhos" ON public.casais_inscritos_filhos;
CREATE POLICY "Anyone can insert casais_inscritos_filhos" ON public.casais_inscritos_filhos FOR INSERT WITH CHECK (true);