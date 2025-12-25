-- Tabela para vincular crianças aos responsáveis
CREATE TABLE public.kids_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  crianca_novo_convertido_id uuid REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  responsavel_member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  parentesco text NOT NULL DEFAULT 'responsavel', -- pai, mae, avo, tio, responsavel
  principal boolean NOT NULL DEFAULT false, -- responsável principal para notificações
  notificar_ausencia boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT check_crianca CHECK (crianca_member_id IS NOT NULL OR crianca_novo_convertido_id IS NOT NULL)
);

-- Tabela para log de notificações enviadas
CREATE TABLE public.kids_notificacoes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  crianca_novo_convertido_id uuid REFERENCES public.novos_convertidos(id) ON DELETE SET NULL,
  responsavel_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  tipo_notificacao text NOT NULL, -- ausencia, lembrete, evento
  data_culto date,
  turma text,
  mensagem text NOT NULL,
  whatsapp_destino text,
  status text NOT NULL DEFAULT 'pendente', -- pendente, enviada, erro
  erro_mensagem text,
  enviada_em timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_kids_responsaveis_crianca_member ON public.kids_responsaveis(crianca_member_id);
CREATE INDEX idx_kids_responsaveis_crianca_nc ON public.kids_responsaveis(crianca_novo_convertido_id);
CREATE INDEX idx_kids_responsaveis_responsavel ON public.kids_responsaveis(responsavel_member_id);
CREATE INDEX idx_kids_notificacoes_data ON public.kids_notificacoes_log(enviada_em);

-- Habilitar RLS
ALTER TABLE public.kids_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_notificacoes_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para kids_responsaveis
CREATE POLICY "Authenticated users can view kids_responsaveis"
  ON public.kids_responsaveis FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert kids_responsaveis"
  ON public.kids_responsaveis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kids_responsaveis"
  ON public.kids_responsaveis FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete kids_responsaveis"
  ON public.kids_responsaveis FOR DELETE
  USING (true);

-- Políticas RLS para kids_notificacoes_log
CREATE POLICY "Authenticated users can view kids_notificacoes_log"
  ON public.kids_notificacoes_log FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert kids_notificacoes_log"
  ON public.kids_notificacoes_log FOR INSERT
  WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_kids_responsaveis_updated_at
  BEFORE UPDATE ON public.kids_responsaveis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();