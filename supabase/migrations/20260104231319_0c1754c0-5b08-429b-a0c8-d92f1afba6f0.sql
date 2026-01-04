-- Remover políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Authenticated users can insert novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Authenticated users can update novos_convertidos" ON public.novos_convertidos;
DROP POLICY IF EXISTS "Only admins can delete novos_convertidos" ON public.novos_convertidos;

-- Criar novas políticas restritivas (apenas admin/master)
CREATE POLICY "Admins can view novos_convertidos"
ON public.novos_convertidos
FOR SELECT
USING (is_admin() OR is_master());

CREATE POLICY "Admins can insert novos_convertidos"
ON public.novos_convertidos
FOR INSERT
WITH CHECK (is_admin() OR is_master());

CREATE POLICY "Admins can update novos_convertidos"
ON public.novos_convertidos
FOR UPDATE
USING (is_admin() OR is_master());

CREATE POLICY "Admins can delete novos_convertidos"
ON public.novos_convertidos
FOR DELETE
USING (is_admin() OR is_master());