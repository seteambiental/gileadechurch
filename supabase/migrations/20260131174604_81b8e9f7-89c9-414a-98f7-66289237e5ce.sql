-- Tabela para solicitações de mudança que precisam de aprovação
CREATE TABLE public.mudancas_pendentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Quem está solicitando a mudança
  solicitante_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  -- Quem deve aprovar
  aprovador_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  
  -- Tipo de mudança
  tipo_mudanca TEXT NOT NULL CHECK (tipo_mudanca IN (
    'lider_ministerio',
    'lider_esposa_ministerio', 
    'integrante_ministerio',
    'lider_casa_refugio',
    'lider_esposa_casa_refugio',
    'supervisor_casa_refugio',
    'supervisor_esposa_casa_refugio',
    'anfitriao_casa_refugio',
    'anfitriao_esposa_casa_refugio',
    'sindico_condominio',
    'sindico_esposa_condominio'
  )),
  
  -- Ação: adicionar, remover, alterar
  acao TEXT NOT NULL CHECK (acao IN ('adicionar', 'remover', 'alterar')),
  
  -- Entidade afetada
  ministry_id UUID REFERENCES public.ministries(id) ON DELETE CASCADE,
  casa_refugio_id UUID REFERENCES public.casas_refugio(id) ON DELETE CASCADE,
  condominio_id UUID REFERENCES public.condominios(id) ON DELETE CASCADE,
  
  -- Membro sendo adicionado/removido/alterado
  membro_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  
  -- Membro atual (para substituições)
  membro_atual_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  
  -- Função específica (para integrantes de ministério)
  funcao_id UUID REFERENCES public.ministerio_funcoes(id) ON DELETE SET NULL,
  
  -- Status da solicitação
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  
  -- Motivo da rejeição (se houver)
  motivo_rejeicao TEXT,
  
  -- Se o email de notificação foi enviado
  email_enviado BOOLEAN DEFAULT false,
  data_email_enviado TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  aprovado_por UUID REFERENCES public.members(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.mudancas_pendentes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view mudancas_pendentes"
  ON public.mudancas_pendentes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert mudancas_pendentes"
  ON public.mudancas_pendentes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update mudancas_pendentes"
  ON public.mudancas_pendentes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete mudancas_pendentes"
  ON public.mudancas_pendentes FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_mudancas_pendentes_updated_at
  BEFORE UPDATE ON public.mudancas_pendentes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_mudancas_pendentes_aprovador ON public.mudancas_pendentes(aprovador_id);
CREATE INDEX idx_mudancas_pendentes_status ON public.mudancas_pendentes(status);
CREATE INDEX idx_mudancas_pendentes_membro ON public.mudancas_pendentes(membro_id);