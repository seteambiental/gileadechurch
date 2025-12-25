-- Corrigir políticas de ministries para permitir leitura autenticada
DROP POLICY IF EXISTS "Authenticated users can view ministries" ON public.ministries;
CREATE POLICY "Authenticated users can view ministries"
ON public.ministries FOR SELECT TO authenticated
USING (true);

-- Corrigir políticas de casas_refugio para permitir leitura autenticada  
DROP POLICY IF EXISTS "Authenticated users can view casas_refugio" ON public.casas_refugio;
CREATE POLICY "Authenticated users can view casas_refugio"
ON public.casas_refugio FOR SELECT TO authenticated
USING (true);

-- Corrigir políticas de condominios para permitir leitura autenticada
DROP POLICY IF EXISTS "Authenticated users can view condominios" ON public.condominios;
CREATE POLICY "Authenticated users can view condominios"
ON public.condominios FOR SELECT TO authenticated
USING (true);