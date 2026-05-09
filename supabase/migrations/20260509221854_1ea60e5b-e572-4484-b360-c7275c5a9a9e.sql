
CREATE TABLE public.evento_emergencia_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL,
  evento_tipo TEXT NOT NULL CHECK (evento_tipo IN ('impacto','agenda')),
  mensagem_inicial TEXT NOT NULL DEFAULT '',
  mensagem_recorrente TEXT NOT NULL DEFAULT '',
  enviar_recorrente BOOLEAN NOT NULL DEFAULT false,
  frequencia_dias INTEGER NOT NULL DEFAULT 7,
  data_inicio_recorrencia DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evento_id, evento_tipo)
);

ALTER TABLE public.evento_emergencia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar config emergencia"
ON public.evento_emergencia_config
FOR ALL TO authenticated
USING (public.has_full_access())
WITH CHECK (public.has_full_access());

CREATE TRIGGER trg_evento_emergencia_config_updated
BEFORE UPDATE ON public.evento_emergencia_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.emergencia_envios_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID,
  evento_id UUID NOT NULL,
  evento_tipo TEXT NOT NULL,
  tipo_envio TEXT NOT NULL CHECK (tipo_envio IN ('inicial','recorrente','manual')),
  telefone_destino TEXT NOT NULL,
  nome_contato_emergencia TEXT,
  nome_participante TEXT,
  mensagem_enviada TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enviado',
  erro TEXT,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_por UUID
);

CREATE INDEX idx_emerg_log_evento ON public.emergencia_envios_log(evento_id, evento_tipo);
CREATE INDEX idx_emerg_log_inscricao ON public.emergencia_envios_log(inscricao_id);

ALTER TABLE public.emergencia_envios_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem logs emergencia"
ON public.emergencia_envios_log
FOR SELECT TO authenticated
USING (public.has_full_access());
