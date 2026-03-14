
-- Tabela de backups realizados
CREATE TABLE public.contingencia_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'database', -- database, storage, code, full
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, sucesso, falha
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_fim TIMESTAMPTZ,
  tamanho_bytes BIGINT,
  localizacao TEXT,
  hash_integridade TEXT,
  observacoes TEXT,
  responsavel_id UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de versões do sistema
CREATE TABLE public.contingencia_versoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT NOT NULL,
  descricao TEXT,
  commit_hash TEXT,
  estavel BOOLEAN NOT NULL DEFAULT false,
  data_deploy TIMESTAMPTZ NOT NULL DEFAULT now(),
  responsavel_id UUID REFERENCES public.members(id),
  rollback_disponivel BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de incidentes
CREATE TABLE public.contingencia_incidentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  severidade TEXT NOT NULL DEFAULT 'media', -- critica, alta, media, baixa
  status TEXT NOT NULL DEFAULT 'aberto', -- aberto, em_andamento, contido, resolvido, encerrado
  tipo_falha TEXT, -- aplicacao, banco_dados, erro_humano, integracao_externa, infraestrutura
  impacto TEXT,
  hora_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_contencao TIMESTAMPTZ,
  hora_resolucao TIMESTAMPTZ,
  hora_encerramento TIMESTAMPTZ,
  responsavel_id UUID REFERENCES public.members(id),
  rto_minutos INTEGER DEFAULT 60,
  rpo_minutos INTEGER DEFAULT 30,
  plano_comunicacao TEXT,
  checklist_identificacao BOOLEAN DEFAULT false,
  checklist_contencao BOOLEAN DEFAULT false,
  checklist_recuperacao BOOLEAN DEFAULT false,
  checklist_validacao BOOLEAN DEFAULT false,
  checklist_encerramento BOOLEAN DEFAULT false,
  analise_pos_incidente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de ações durante incidente
CREATE TABLE public.contingencia_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidente_id UUID NOT NULL REFERENCES public.contingencia_incidentes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tipo TEXT DEFAULT 'acao', -- acao, observacao, comunicacao, escalacao
  responsavel_id UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de procedimentos operacionais
CREATE TABLE public.contingencia_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL, -- backup, restore, rollback, comunicacao, validacao, acionamento
  conteudo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  atualizado_por UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger de updated_at
CREATE TRIGGER update_contingencia_incidentes_updated_at
  BEFORE UPDATE ON public.contingencia_incidentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contingencia_procedimentos_updated_at
  BEFORE UPDATE ON public.contingencia_procedimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.contingencia_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingencia_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingencia_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingencia_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contingencia_procedimentos ENABLE ROW LEVEL SECURITY;

-- Políticas: somente admin/pastor tem acesso
CREATE POLICY "Full access for admins" ON public.contingencia_backups FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());
CREATE POLICY "Full access for admins" ON public.contingencia_versoes FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());
CREATE POLICY "Full access for admins" ON public.contingencia_incidentes FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());
CREATE POLICY "Full access for admins" ON public.contingencia_acoes FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());
CREATE POLICY "Full access for admins" ON public.contingencia_procedimentos FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());
