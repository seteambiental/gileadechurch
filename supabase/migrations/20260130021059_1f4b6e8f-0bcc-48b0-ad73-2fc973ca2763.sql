
-- Atualizar a função para verificar se é líder OU integrante do ministério
CREATE OR REPLACE FUNCTION public.is_ministry_member(ministry_uuid uuid)
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
      AND mf.function_type IN ('lider_ministerio', 'integrante_ministerio')
  )
$$;

-- Atualizar política de SELECT para incluir integrantes do ministério
DROP POLICY IF EXISTS "Membros e líderes podem ver candidaturas" ON public.candidaturas_ministerio;

CREATE POLICY "Membros e líderes podem ver candidaturas"
ON public.candidaturas_ministerio
FOR SELECT
TO authenticated
USING (
  -- O membro pode ver suas próprias candidaturas
  member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  -- OU é membro/líder do ministério
  OR is_ministry_member(ministry_id)
  -- OU tem acesso total (admin, pastor)
  OR has_full_access()
);

-- Atualizar política ALL para também considerar integrantes (para gerenciar candidaturas)
DROP POLICY IF EXISTS "Admins e líderes podem gerenciar candidaturas" ON public.candidaturas_ministerio;

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
