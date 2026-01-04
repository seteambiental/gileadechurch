-- Remover políticas existentes da tabela kids_responsaveis
DROP POLICY IF EXISTS "Authenticated users can delete kids_responsaveis" ON public.kids_responsaveis;
DROP POLICY IF EXISTS "Authenticated users can insert kids_responsaveis" ON public.kids_responsaveis;
DROP POLICY IF EXISTS "Authenticated users can update kids_responsaveis" ON public.kids_responsaveis;
DROP POLICY IF EXISTS "Authenticated users can view kids_responsaveis" ON public.kids_responsaveis;

-- Criar função para verificar se o usuário é líder do Kids
CREATE OR REPLACE FUNCTION public.is_kids_leader()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kids_lideres kl
    INNER JOIN public.members m ON m.id = kl.member_id
    WHERE m.user_id = auth.uid()
      AND kl.ativo = true
  )
$$;

-- Criar função para verificar se é admin, master ou líder do Kids
CREATE OR REPLACE FUNCTION public.can_access_kids_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin() 
    OR is_master() 
    OR is_kids_leader()
$$;

-- Criar novas políticas restritivas para kids_responsaveis
CREATE POLICY "Kids leaders and admins can view kids_responsaveis"
ON public.kids_responsaveis
FOR SELECT
USING (can_access_kids_data());

CREATE POLICY "Kids leaders and admins can insert kids_responsaveis"
ON public.kids_responsaveis
FOR INSERT
WITH CHECK (can_access_kids_data());

CREATE POLICY "Kids leaders and admins can update kids_responsaveis"
ON public.kids_responsaveis
FOR UPDATE
USING (can_access_kids_data());

CREATE POLICY "Kids leaders and admins can delete kids_responsaveis"
ON public.kids_responsaveis
FOR DELETE
USING (can_access_kids_data());

-- Aplicar as mesmas restrições à tabela kids_presencas (dados sensíveis de presenças de crianças)
DROP POLICY IF EXISTS "Authenticated users can delete kids_presencas" ON public.kids_presencas;
DROP POLICY IF EXISTS "Authenticated users can insert kids_presencas" ON public.kids_presencas;
DROP POLICY IF EXISTS "Authenticated users can update kids_presencas" ON public.kids_presencas;
DROP POLICY IF EXISTS "Authenticated users can view kids_presencas" ON public.kids_presencas;

CREATE POLICY "Kids leaders and admins can view kids_presencas"
ON public.kids_presencas
FOR SELECT
USING (can_access_kids_data());

CREATE POLICY "Kids leaders and admins can insert kids_presencas"
ON public.kids_presencas
FOR INSERT
WITH CHECK (can_access_kids_data());

CREATE POLICY "Kids leaders and admins can update kids_presencas"
ON public.kids_presencas
FOR UPDATE
USING (can_access_kids_data());

CREATE POLICY "Kids leaders and admins can delete kids_presencas"
ON public.kids_presencas
FOR DELETE
USING (can_access_kids_data());