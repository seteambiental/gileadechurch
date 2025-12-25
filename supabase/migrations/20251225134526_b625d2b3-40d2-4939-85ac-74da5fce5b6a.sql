-- Allow anon users to insert into novos_convertidos (for bypass mode)
-- This is needed because the Kids page is accessed via auth bypass
DROP POLICY IF EXISTS "Authenticated users can insert novos_convertidos" ON public.novos_convertidos;

-- Create policy that allows both authenticated and anon users to insert
CREATE POLICY "Anyone can insert novos_convertidos" 
ON public.novos_convertidos 
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);