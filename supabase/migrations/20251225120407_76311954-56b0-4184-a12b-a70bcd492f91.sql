-- Drop existing restrictive policies on inscricoes_eventos
DROP POLICY IF EXISTS "Anyone can insert inscricoes" ON public.inscricoes_eventos;
DROP POLICY IF EXISTS "Authenticated users can delete inscricoes" ON public.inscricoes_eventos;
DROP POLICY IF EXISTS "Authenticated users can update inscricoes" ON public.inscricoes_eventos;
DROP POLICY IF EXISTS "Authenticated users can view inscricoes" ON public.inscricoes_eventos;

-- Create permissive policies for inscricoes_eventos
-- Anyone can insert (for public registration form)
CREATE POLICY "Anyone can insert inscricoes" 
ON public.inscricoes_eventos 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Anyone can view inscricoes (needed to check if already registered)
CREATE POLICY "Anyone can view inscricoes" 
ON public.inscricoes_eventos 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Authenticated users can update inscricoes
CREATE POLICY "Authenticated users can update inscricoes" 
ON public.inscricoes_eventos 
FOR UPDATE 
TO authenticated
USING (true);

-- Authenticated users can delete inscricoes
CREATE POLICY "Authenticated users can delete inscricoes" 
ON public.inscricoes_eventos 
FOR DELETE 
TO authenticated
USING (true);