
-- Tabela de permissões configuráveis para o Pastor Auxiliar
-- Cada linha representa um módulo/ação que pode ser habilitado ou desabilitado
CREATE TABLE public.pastor_auxiliar_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, modulo)
);

-- Enable RLS
ALTER TABLE public.pastor_auxiliar_permissoes ENABLE ROW LEVEL SECURITY;

-- Somente admins/pastor_geral podem gerenciar permissões do pastor auxiliar
CREATE POLICY "Admins can manage pastor_auxiliar_permissoes"
  ON public.pastor_auxiliar_permissoes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'pastor_geral')
    )
  );

-- Pastor auxiliar pode ver suas próprias permissões
CREATE POLICY "Pastor auxiliar can view own permissions"
  ON public.pastor_auxiliar_permissoes
  FOR SELECT
  USING (user_id = auth.uid());

-- Função para verificar se pastor auxiliar tem permissão em determinado módulo
CREATE OR REPLACE FUNCTION public.pastor_auxiliar_has_permission(pa_user_id uuid, modulo_check text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pastor_auxiliar_permissoes
    WHERE user_id = pa_user_id
      AND modulo = modulo_check
      AND ativo = true
  )
$$;

-- Atualizar has_full_access para aceitar módulo opcional
-- Mantém compatibilidade: sem argumento = acesso total (admin/pastor_geral)
-- Com argumento = verifica permissão específica do pastor_auxiliar
CREATE OR REPLACE FUNCTION public.has_full_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'pastor_geral', 'pastor_auxiliar')
  )
$$;

-- Trigger para updated_at
CREATE TRIGGER update_pastor_auxiliar_permissoes_updated_at
  BEFORE UPDATE ON public.pastor_auxiliar_permissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
