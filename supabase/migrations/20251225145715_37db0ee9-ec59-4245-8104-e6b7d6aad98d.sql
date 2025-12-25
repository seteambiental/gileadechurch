-- Permitir leitura pública (necessário para modo bypass/sem login)
DROP POLICY IF EXISTS "Anyone can view ministries" ON public.ministries;
CREATE POLICY "Anyone can view ministries"
ON public.ministries
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view casas_refugio" ON public.casas_refugio;
CREATE POLICY "Anyone can view casas_refugio"
ON public.casas_refugio
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view condominios" ON public.condominios;
CREATE POLICY "Anyone can view condominios"
ON public.condominios
FOR SELECT
USING (true);