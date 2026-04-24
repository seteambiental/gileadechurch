-- Nova tabela de fila de envios
CREATE TABLE IF NOT EXISTS public.comunicacao_fila (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  segmento TEXT,
  destinatario_telefone TEXT NOT NULL,
  destinatario_nome TEXT,
  destinatario_member_id UUID,
  conteudo TEXT NOT NULL,
  midia_url TEXT,
  evento_id UUID,
  iniciado_por UUID,
  dedupe_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  tentativas INT NOT NULL DEFAULT 0,
  max_tentativas INT NOT NULL DEFAULT 3,
  proxima_tentativa_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_erro TEXT,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fila_status_proxima ON public.comunicacao_fila (status, proxima_tentativa_em);
CREATE INDEX IF NOT EXISTS idx_fila_dedupe ON public.comunicacao_fila (dedupe_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fila_tipo_created ON public.comunicacao_fila (tipo, created_at DESC);

ALTER TABLE public.comunicacao_fila ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam fila WhatsApp"
ON public.comunicacao_fila FOR ALL
USING (public.has_full_access())
WITH CHECK (public.has_full_access());

-- Trigger updated_at
CREATE TRIGGER update_comunicacao_fila_updated_at
BEFORE UPDATE ON public.comunicacao_fila
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas de rastreio em comunicacao_envios (idempotente)
ALTER TABLE public.comunicacao_envios
  ADD COLUMN IF NOT EXISTS fila_id UUID,
  ADD COLUMN IF NOT EXISTS tentativas INT NOT NULL DEFAULT 1;