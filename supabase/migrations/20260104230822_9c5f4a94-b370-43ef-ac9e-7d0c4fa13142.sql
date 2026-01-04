-- Remover política problemática
DROP POLICY IF EXISTS "Anyone can view approved testimonies" ON public.testemunhos;

-- Criar nova política restritiva:
-- - Testemunhos aprovados: visíveis para todos (público)
-- - Testemunhos não aprovados: visíveis apenas para admins/masters
CREATE POLICY "View testimonies based on approval status"
ON public.testemunhos
FOR SELECT
USING (
  aprovado = true 
  OR is_admin() 
  OR is_master()
);