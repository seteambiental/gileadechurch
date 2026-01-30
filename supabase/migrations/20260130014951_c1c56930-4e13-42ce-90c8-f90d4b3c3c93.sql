-- Create a function to check if user has access to manage member requests
CREATE OR REPLACE FUNCTION public.can_manage_member_requests()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'pastor_geral', 'pastor_auxiliar', 'lider_ministerio')
  )
$$;

-- Drop existing policies on member_requests
DROP POLICY IF EXISTS "Full access can update member requests" ON public.member_requests;
DROP POLICY IF EXISTS "Full access can delete member requests" ON public.member_requests;
DROP POLICY IF EXISTS "Full access can view member requests" ON public.member_requests;

-- Create new policies that include lider_ministerio
CREATE POLICY "Leaders can view member requests"
ON public.member_requests
FOR SELECT
TO authenticated
USING (can_manage_member_requests());

CREATE POLICY "Leaders can update member requests"
ON public.member_requests
FOR UPDATE
TO authenticated
USING (can_manage_member_requests())
WITH CHECK (can_manage_member_requests());

CREATE POLICY "Leaders can delete member requests"
ON public.member_requests
FOR DELETE
TO authenticated
USING (can_manage_member_requests());

-- Drop existing policies on members for insert
DROP POLICY IF EXISTS "Full access can insert members" ON public.members;
DROP POLICY IF EXISTS "Full access can update members" ON public.members;
DROP POLICY IF EXISTS "Full access can delete members" ON public.members;

-- Create new policies that include lider_ministerio
CREATE POLICY "Leaders can insert members"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (can_manage_member_requests());

CREATE POLICY "Leaders can update members"
ON public.members
FOR UPDATE
TO authenticated
USING (can_manage_member_requests())
WITH CHECK (can_manage_member_requests());

CREATE POLICY "Leaders can delete members"
ON public.members
FOR DELETE
TO authenticated
USING (can_manage_member_requests());