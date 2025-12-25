-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can insert novos_convertidos" ON public.novos_convertidos;

-- Create permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert novos_convertidos" 
ON public.novos_convertidos 
FOR INSERT 
TO authenticated
WITH CHECK (true);