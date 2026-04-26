CREATE TABLE public.mensagens_evento_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL,
  evento_tipo TEXT NOT NULL CHECK (evento_tipo IN ('agenda', 'impacto')),
  tipo_mensagem TEXT NOT NULL CHECK (tipo_mensagem IN ('confirmacao_inscricao', 'inscricao_recebida', 'lembrete_pagamento', 'vaga_liberada')),
  mensagem TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (evento_id, evento_tipo, tipo_mensagem)
);

ALTER TABLE public.mensagens_evento_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access can view templates"
ON public.mensagens_evento_templates
FOR SELECT
USING (public.has_full_access());

CREATE POLICY "Full access can insert templates"
ON public.mensagens_evento_templates
FOR INSERT
WITH CHECK (public.has_full_access());

CREATE POLICY "Full access can update templates"
ON public.mensagens_evento_templates
FOR UPDATE
USING (public.has_full_access());

CREATE POLICY "Full access can delete templates"
ON public.mensagens_evento_templates
FOR DELETE
USING (public.has_full_access());

-- Edge function (service role) precisa ler para enviar
CREATE POLICY "Service role can read templates"
ON public.mensagens_evento_templates
FOR SELECT
USING (true);

CREATE TRIGGER update_mensagens_evento_templates_updated_at
BEFORE UPDATE ON public.mensagens_evento_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mensagens_evento_templates_lookup 
ON public.mensagens_evento_templates(evento_id, tipo_mensagem);