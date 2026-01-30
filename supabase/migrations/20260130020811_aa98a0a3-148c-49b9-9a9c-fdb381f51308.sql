
-- Criar função para verificar se é líder de um ministério específico
CREATE OR REPLACE FUNCTION public.is_ministry_leader(ministry_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.member_functions mf
    INNER JOIN public.members m ON m.id = mf.member_id
    WHERE m.user_id = auth.uid()
      AND mf.ministry_id = ministry_uuid
      AND mf.function_type = 'lider_ministerio'
  )
$$;

-- Remover políticas antigas de SELECT na tabela candidaturas_ministerio
DROP POLICY IF EXISTS "Membros podem ver suas próprias candidaturas" ON public.candidaturas_ministerio;

-- Criar nova política que permite:
-- 1. Membros verem suas próprias candidaturas
-- 2. Líderes de ministério verem candidaturas do seu ministério
-- 3. Admins verem todas (já coberto pela política ALL)
CREATE POLICY "Membros e líderes podem ver candidaturas"
ON public.candidaturas_ministerio
FOR SELECT
TO authenticated
USING (
  -- O membro pode ver suas próprias candidaturas
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  -- OU é líder do ministério
  OR is_ministry_leader(ministry_id)
  -- OU tem acesso total (admin, pastor)
  OR has_full_access()
);

-- Atualizar política de UPDATE para líderes de ministério
DROP POLICY IF EXISTS "Admins podem gerenciar todas candidaturas" ON public.candidaturas_ministerio;

CREATE POLICY "Admins e líderes podem gerenciar candidaturas"
ON public.candidaturas_ministerio
FOR ALL
TO authenticated
USING (
  has_full_access()
  OR is_ministry_leader(ministry_id)
)
WITH CHECK (
  has_full_access()
  OR is_ministry_leader(ministry_id)
);
