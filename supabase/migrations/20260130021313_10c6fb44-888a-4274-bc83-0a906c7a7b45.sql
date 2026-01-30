-- Recriar a política de SELECT para garantir que admins vejam tudo
DROP POLICY IF EXISTS "Membros e líderes podem ver candidaturas" ON public.candidaturas_ministerio;

CREATE POLICY "Membros e líderes podem ver candidaturas"
ON public.candidaturas_ministerio
FOR SELECT
TO authenticated
USING (
  -- Primeiro: Admins/Pastores veem TUDO
  has_full_access()
  -- OU é líder específico do ministério
  OR is_ministry_leader(ministry_id)
  -- OU é integrante do ministério
  OR is_ministry_member(ministry_id)
  -- OU é o próprio candidato vendo sua candidatura
  OR member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
);