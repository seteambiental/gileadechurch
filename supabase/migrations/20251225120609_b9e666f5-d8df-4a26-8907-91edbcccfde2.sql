-- Drop existing restrictive policies on members (for public search in inscription form)
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;

-- Create permissive policy for anyone to view members (needed for inscription search)
CREATE POLICY "Anyone can view members" 
ON public.members 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Drop existing restrictive policies on novos_convertidos (for public search)
DROP POLICY IF EXISTS "Authenticated users can view novos_convertidos" ON public.novos_convertidos;

-- Create permissive policy for anyone to view novos_convertidos
CREATE POLICY "Anyone can view novos_convertidos" 
ON public.novos_convertidos 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Also fix agenda_igreja for public event viewing
DROP POLICY IF EXISTS "Authenticated users can view agenda_igreja" ON public.agenda_igreja;

CREATE POLICY "Anyone can view agenda_igreja" 
ON public.agenda_igreja 
FOR SELECT 
TO anon, authenticated
USING (true);