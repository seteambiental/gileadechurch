-- Tabela para registrar envios de mensagens de aniversário
CREATE TABLE IF NOT EXISTS public.aniversarios_enviados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  novo_convertido_id UUID REFERENCES public.novos_convertidos(id) ON DELETE SET NULL,
  data_envio DATE NOT NULL DEFAULT CURRENT_DATE,
  sucesso BOOLEAN NOT NULL DEFAULT true,
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Evitar duplicatas no mesmo dia
  UNIQUE(member_id, data_envio),
  UNIQUE(novo_convertido_id, data_envio)
);

-- Index para buscar por data
CREATE INDEX idx_aniversarios_enviados_data ON public.aniversarios_enviados(data_envio);

-- RLS
ALTER TABLE public.aniversarios_enviados ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver o log
CREATE POLICY "Admins can view birthday logs"
  ON public.aniversarios_enviados
  FOR SELECT
  USING (is_admin() OR is_master());

CREATE POLICY "System can insert birthday logs"
  ON public.aniversarios_enviados
  FOR INSERT
  WITH CHECK (true);

-- Comentário
COMMENT ON TABLE public.aniversarios_enviados IS 'Log de mensagens de aniversário enviadas';