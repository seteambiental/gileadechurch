-- Criar tabela de inscrições de eventos
CREATE TABLE public.inscricoes_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.agenda_igreja(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  novo_convertido_id UUID REFERENCES public.novos_convertidos(id) ON DELETE SET NULL,
  nome_participante TEXT NOT NULL,
  genero TEXT,
  telefone_contato TEXT NOT NULL,
  telefone_emergencia TEXT,
  is_menor BOOLEAN DEFAULT false,
  nome_responsavel TEXT,
  telefone_responsavel TEXT,
  preferencia_beliche TEXT CHECK (preferencia_beliche IN ('cima', 'baixo', 'indiferente')),
  tem_alergia_alimentar BOOLEAN DEFAULT false,
  descricao_alergia TEXT,
  toma_medicamento BOOLEAN DEFAULT false,
  descricao_medicamento TEXT,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('pix', 'cartao_credito', 'cartao_debito')),
  status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'confirmado', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_inscricoes_eventos_updated_at
  BEFORE UPDATE ON public.inscricoes_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.inscricoes_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir inscrições públicas (sem autenticação)
CREATE POLICY "Anyone can insert inscricoes"
  ON public.inscricoes_eventos
  FOR INSERT
  WITH CHECK (true);

-- Autenticados podem visualizar
CREATE POLICY "Authenticated users can view inscricoes"
  ON public.inscricoes_eventos
  FOR SELECT
  TO authenticated
  USING (true);

-- Autenticados podem atualizar
CREATE POLICY "Authenticated users can update inscricoes"
  ON public.inscricoes_eventos
  FOR UPDATE
  TO authenticated
  USING (true);

-- Autenticados podem deletar
CREATE POLICY "Authenticated users can delete inscricoes"
  ON public.inscricoes_eventos
  FOR DELETE
  TO authenticated
  USING (true);