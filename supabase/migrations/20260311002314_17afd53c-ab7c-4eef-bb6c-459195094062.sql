
-- Allow members to see their own kids_responsaveis records
CREATE POLICY "Members can view own kids_responsaveis"
ON public.kids_responsaveis
FOR SELECT
TO authenticated
USING (
  responsavel_member_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  )
);
