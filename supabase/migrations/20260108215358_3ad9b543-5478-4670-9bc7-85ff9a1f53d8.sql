-- Ajustar políticas de acesso para excluir membros / solicitações com perfis de acesso completo

-- member_requests
ALTER TABLE public.member_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view member requests" ON public.member_requests;
DROP POLICY IF EXISTS "Admin can update member requests" ON public.member_requests;
DROP POLICY IF EXISTS "Admin can delete member requests" ON public.member_requests;

CREATE POLICY "Full access can view member requests"
ON public.member_requests
FOR SELECT
TO authenticated
USING (public.has_full_access());

CREATE POLICY "Full access can update member requests"
ON public.member_requests
FOR UPDATE
TO authenticated
USING (public.has_full_access())
WITH CHECK (public.has_full_access());

CREATE POLICY "Full access can delete member requests"
ON public.member_requests
FOR DELETE
TO authenticated
USING (public.has_full_access());

-- members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete members" ON public.members;
DROP POLICY IF EXISTS "Members delete by admin or master" ON public.members;
DROP POLICY IF EXISTS "Admins can insert members" ON public.members;
DROP POLICY IF EXISTS "Members insert by admin or master" ON public.members;
DROP POLICY IF EXISTS "Admins can update members" ON public.members;
DROP POLICY IF EXISTS "Members update by admin or master" ON public.members;

CREATE POLICY "Full access can insert members"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (public.has_full_access());

CREATE POLICY "Full access can update members"
ON public.members
FOR UPDATE
TO authenticated
USING (public.has_full_access())
WITH CHECK (public.has_full_access());

CREATE POLICY "Full access can delete members"
ON public.members
FOR DELETE
TO authenticated
USING (public.has_full_access());

-- manter leitura para autenticados (já existe), não alteramos aqui
