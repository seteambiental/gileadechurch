-- Remover política de SELECT pública
DROP POLICY IF EXISTS "Anyone can view prayer requests" ON public.pedidos_oracao;

-- Criar nova política restritiva - apenas usuários autenticados podem ver os pedidos
CREATE POLICY "Authenticated users can view prayer requests"
ON public.pedidos_oracao
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- A política de INSERT pública permanece para permitir que visitantes enviem pedidos de oração