-- Tabela para auditar envios automáticos e segmentados de WhatsApp
CREATE TABLE IF NOT EXISTS public.comunicacao_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'inscricao_recebida' | 'cadastro_aprovado' | 'flyer_homepage' | 'segmentado_membros' | 'mensagem_direta'
  segmento TEXT, -- ex: 'todos_membros', 'lideres_ministerio', 'integrantes_ministerio:<id>', etc.
  destinatario_telefone TEXT,
  destinatario_nome TEXT,
  destinatario_member_id UUID,
  conteudo TEXT,
  midia_url TEXT,
  status TEXT NOT NULL DEFAULT 'enviado', -- 'enviado' | 'erro'
  erro_mensagem TEXT,
  evento_id UUID,
  iniciado_por UUID, -- auth user id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comunicacao_envios_created_at ON public.comunicacao_envios (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicacao_envios_tipo ON public.comunicacao_envios (tipo);

ALTER TABLE public.comunicacao_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/pastores podem ver envios"
ON public.comunicacao_envios
FOR SELECT
TO authenticated
USING (public.has_full_access());

CREATE POLICY "Admin/pastores podem inserir envios"
ON public.comunicacao_envios
FOR INSERT
TO authenticated
WITH CHECK (public.has_full_access());