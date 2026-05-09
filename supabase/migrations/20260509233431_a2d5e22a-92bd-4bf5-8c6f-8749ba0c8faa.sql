
CREATE TABLE IF NOT EXISTS public.categoria_mensagem_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_evento TEXT NOT NULL, -- 'agenda' | 'impacto'
  tipo_mensagem TEXT NOT NULL,    -- 'confirmacao_inscricao' | 'inscricao_recebida' | 'lembrete_pagamento' | 'vaga_liberada' | 'contato_emergencia'
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria_evento, tipo_mensagem)
);

ALTER TABLE public.categoria_mensagem_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categoria mensagem config select all"
  ON public.categoria_mensagem_config FOR SELECT
  USING (true);

CREATE POLICY "Admins manage categoria mensagem config"
  ON public.categoria_mensagem_config FOR ALL
  USING (public.has_full_access())
  WITH CHECK (public.has_full_access());

CREATE TRIGGER trg_categoria_mensagem_config_updated_at
  BEFORE UPDATE ON public.categoria_mensagem_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.categoria_mensagem_config (categoria_evento, tipo_mensagem, ativo) VALUES
  ('impacto', 'confirmacao_inscricao', true),
  ('impacto', 'inscricao_recebida', true),
  ('impacto', 'lembrete_pagamento', true),
  ('impacto', 'vaga_liberada', true),
  ('impacto', 'contato_emergencia', true),
  ('agenda', 'confirmacao_inscricao', false),
  ('agenda', 'inscricao_recebida', false),
  ('agenda', 'lembrete_pagamento', false),
  ('agenda', 'vaga_liberada', false),
  ('agenda', 'contato_emergencia', true)
ON CONFLICT (categoria_evento, tipo_mensagem) DO NOTHING;
