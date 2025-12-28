-- Drop existing overly permissive policies on novos_convertidos
DROP POLICY IF EXISTS "Anyone can insert novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Anyone can update novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Anyone can view novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Authenticated users can update novos_convertidos" ON public.novos_convertidos;

-- Create new policies that restrict access to authenticated users only
CREATE POLICY "Authenticated users can view novos_convertidos"
ON public.novos_convertidos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert novos_convertidos"
ON public.novos_convertidos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update novos_convertidos"
ON public.novos_convertidos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);