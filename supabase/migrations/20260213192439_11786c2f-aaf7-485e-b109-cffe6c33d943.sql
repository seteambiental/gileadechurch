
-- ============================================================
-- RBAC: Funções de segurança para restringir acesso por escopo
-- ============================================================

-- 1. Função: pode gerenciar dados de uma Casa Refúgio específica
-- (líder, supervisor da casa, síndico do condomínio, ou admin/pastor)
CREATE OR REPLACE FUNCTION public.can_manage_casa_refugio(casa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_full_access()
    OR EXISTS (
      SELECT 1 FROM public.member_functions mf
      INNER JOIN public.members m ON m.id = mf.member_id
      WHERE m.user_id = auth.uid()
        AND mf.casa_refugio_id = casa_id
        AND mf.function_type IN ('lider_casa_refugio', 'supervisor_casa_refugio')
    )
    OR EXISTS (
      -- Líder/supervisor diretamente na tabela casas_refugio
      SELECT 1 FROM public.casas_refugio cr
      INNER JOIN public.members m ON m.user_id = auth.uid()
      WHERE cr.id = casa_id
        AND (cr.lider_id = m.id OR cr.lider_esposa_id = m.id 
             OR cr.supervisor_id = m.id OR cr.supervisor_esposa_id = m.id)
    )
    OR EXISTS (
      -- Síndico do condomínio da casa
      SELECT 1 FROM public.casas_refugio cr
      INNER JOIN public.condominios c ON c.name = cr.condominio
      INNER JOIN public.members m ON m.user_id = auth.uid()
      WHERE cr.id = casa_id
        AND (c.sindico_id = m.id OR c.sindico_esposa_id = m.id)
    )
$$;

-- 2. Função: pode gerenciar dados de um Ministério específico
-- (líder do ministério ou admin/pastor)
CREATE OR REPLACE FUNCTION public.can_manage_ministry(ministry_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_full_access()
    OR is_ministry_leader(ministry_uuid)
$$;

-- ============================================================
-- Atualizar RLS em encontros_casa_refugio
-- ============================================================

-- Remover policies antigas permissivas
DROP POLICY IF EXISTS "Authenticated users can insert encontros" ON public.encontros_casa_refugio;
DROP POLICY IF EXISTS "Authenticated users can update encontros" ON public.encontros_casa_refugio;
DROP POLICY IF EXISTS "Authenticated users can delete encontros" ON public.encontros_casa_refugio;

-- Novas policies restritivas
CREATE POLICY "Leaders can insert encontros"
ON public.encontros_casa_refugio
FOR INSERT
TO authenticated
WITH CHECK (can_manage_casa_refugio(casa_refugio_id));

CREATE POLICY "Leaders can update encontros"
ON public.encontros_casa_refugio
FOR UPDATE
TO authenticated
USING (can_manage_casa_refugio(casa_refugio_id));

CREATE POLICY "Leaders can delete encontros"
ON public.encontros_casa_refugio
FOR DELETE
TO authenticated
USING (can_manage_casa_refugio(casa_refugio_id));

-- ============================================================
-- Atualizar RLS em ministerio_escalas
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert ministerio_escalas" ON public.ministerio_escalas;
DROP POLICY IF EXISTS "Authenticated users can update ministerio_escalas" ON public.ministerio_escalas;
DROP POLICY IF EXISTS "Authenticated users can delete ministerio_escalas" ON public.ministerio_escalas;

CREATE POLICY "Ministry leaders can insert escalas"
ON public.ministerio_escalas
FOR INSERT
TO authenticated
WITH CHECK (can_manage_ministry(ministry_id));

CREATE POLICY "Ministry leaders can update escalas"
ON public.ministerio_escalas
FOR UPDATE
TO authenticated
USING (can_manage_ministry(ministry_id));

CREATE POLICY "Ministry leaders can delete escalas"
ON public.ministerio_escalas
FOR DELETE
TO authenticated
USING (can_manage_ministry(ministry_id));

-- ============================================================
-- Atualizar RLS em ministerio_repertorio
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert ministerio_repertorio" ON public.ministerio_repertorio;
DROP POLICY IF EXISTS "Authenticated users can update ministerio_repertorio" ON public.ministerio_repertorio;
DROP POLICY IF EXISTS "Authenticated users can delete ministerio_repertorio" ON public.ministerio_repertorio;

CREATE POLICY "Ministry leaders can insert repertorio"
ON public.ministerio_repertorio
FOR INSERT
TO authenticated
WITH CHECK (can_manage_ministry(ministry_id));

CREATE POLICY "Ministry leaders can update repertorio"
ON public.ministerio_repertorio
FOR UPDATE
TO authenticated
USING (can_manage_ministry(ministry_id));

CREATE POLICY "Ministry leaders can delete repertorio"
ON public.ministerio_repertorio
FOR DELETE
TO authenticated
USING (can_manage_ministry(ministry_id));

-- ============================================================
-- Atualizar RLS em member_functions (apenas admin/pastor podem gerenciar)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can insert member_functions" ON public.member_functions;
DROP POLICY IF EXISTS "Anyone can update member_functions" ON public.member_functions;
DROP POLICY IF EXISTS "Anyone can delete member_functions" ON public.member_functions;

CREATE POLICY "Admins and leaders can insert member_functions"
ON public.member_functions
FOR INSERT
TO authenticated
WITH CHECK (
  has_full_access()
  OR (ministry_id IS NOT NULL AND is_ministry_leader(ministry_id))
  OR (casa_refugio_id IS NOT NULL AND can_manage_casa_refugio(casa_refugio_id))
);

CREATE POLICY "Admins and leaders can update member_functions"
ON public.member_functions
FOR UPDATE
TO authenticated
USING (
  has_full_access()
  OR (ministry_id IS NOT NULL AND is_ministry_leader(ministry_id))
  OR (casa_refugio_id IS NOT NULL AND can_manage_casa_refugio(casa_refugio_id))
);

CREATE POLICY "Admins and leaders can delete member_functions"
ON public.member_functions
FOR DELETE
TO authenticated
USING (
  has_full_access()
  OR (ministry_id IS NOT NULL AND is_ministry_leader(ministry_id))
  OR (casa_refugio_id IS NOT NULL AND can_manage_casa_refugio(casa_refugio_id))
);

-- ============================================================
-- Atualizar RLS em casas_refugio (apenas admin/pastor podem alterar/excluir)
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can update casas_refugio" ON public.casas_refugio;
DROP POLICY IF EXISTS "Authenticated users can delete casas_refugio" ON public.casas_refugio;
DROP POLICY IF EXISTS "Authenticated users can insert casas_refugio" ON public.casas_refugio;

CREATE POLICY "Admins can insert casas_refugio"
ON public.casas_refugio
FOR INSERT
TO authenticated
WITH CHECK (has_full_access());

CREATE POLICY "Leaders and admins can update casas_refugio"
ON public.casas_refugio
FOR UPDATE
TO authenticated
USING (has_full_access() OR can_manage_casa_refugio(id));

CREATE POLICY "Admins can delete casas_refugio"
ON public.casas_refugio
FOR DELETE
TO authenticated
USING (has_full_access());
