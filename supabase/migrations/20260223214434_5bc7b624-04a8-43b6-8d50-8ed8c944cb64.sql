
-- Tabela unificada para solicitações do sistema (melhorias, erros, implementações)
CREATE TABLE public.sistema_solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero SERIAL,
  tipo TEXT NOT NULL CHECK (tipo IN ('melhoria', 'erro', 'implementacao')),
  painel TEXT NOT NULL CHECK (painel IN ('gestao', 'ministerios')),
  descricao TEXT NOT NULL,
  card TEXT,
  aba TEXT,
  sub_aba TEXT,
  status TEXT NOT NULL DEFAULT 'enviada',
  solicitante_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  solicitante_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sistema_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver suas próprias solicitações
CREATE POLICY "Users can view own solicitacoes"
  ON public.sistema_solicitacoes FOR SELECT TO authenticated
  USING (solicitante_id = auth.uid() OR has_full_access());

-- Todos autenticados podem criar solicitações
CREATE POLICY "Users can insert solicitacoes"
  ON public.sistema_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (solicitante_id = auth.uid());

-- Apenas admins podem atualizar (mudar status)
CREATE POLICY "Admins can update solicitacoes"
  ON public.sistema_solicitacoes FOR UPDATE TO authenticated
  USING (has_full_access());

CREATE TRIGGER update_sistema_solicitacoes_updated_at
  BEFORE UPDATE ON public.sistema_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
