-- Adicionar política para permitir INSERT/UPDATE/DELETE por usuários anônimos (bypass mode)
CREATE POLICY "Anon can manage igreja_config" 
ON public.igreja_config 
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);