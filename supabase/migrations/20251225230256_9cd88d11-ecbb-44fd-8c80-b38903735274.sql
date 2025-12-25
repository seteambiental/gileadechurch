-- Atualizar política de UPDATE para novos_convertidos para permitir "anon" também
DROP POLICY IF EXISTS "Anyone can update novos_convertidos" ON public.novos_convertidos;

CREATE POLICY "Anyone can update novos_convertidos" 
ON public.novos_convertidos 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);