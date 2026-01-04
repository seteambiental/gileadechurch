-- Adicionar coluna user_id na tabela members para vincular membros a usuários autenticados
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Criar índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);

-- Tabela para candidaturas a ministérios
CREATE TABLE public.candidaturas_ministerio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  mensagem text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.candidaturas_ministerio ENABLE ROW LEVEL SECURITY;

-- Políticas para candidaturas
CREATE POLICY "Membros podem ver suas próprias candidaturas"
  ON public.candidaturas_ministerio FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Membros podem criar candidaturas"
  ON public.candidaturas_ministerio FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "Admins podem gerenciar todas candidaturas"
  ON public.candidaturas_ministerio FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master'));

-- Adicionar coluna lider_whatsapp na tabela ministries
ALTER TABLE public.ministries ADD COLUMN IF NOT EXISTS lider_whatsapp text;

-- Tabela para configuração de PIX da igreja
CREATE TABLE public.igreja_pix (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_chave text NOT NULL,
  chave text NOT NULL,
  nome_beneficiario text NOT NULL,
  cidade text,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.igreja_pix ENABLE ROW LEVEL SECURITY;

-- Políticas para PIX
CREATE POLICY "Qualquer pessoa autenticada pode ver PIX ativos"
  ON public.igreja_pix FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins podem gerenciar PIX"
  ON public.igreja_pix FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'master'));

-- Inserir configuração padrão de PIX
INSERT INTO public.igreja_pix (tipo_chave, chave, nome_beneficiario, cidade, descricao)
VALUES ('cnpj', '00.000.000/0001-00', 'Igreja Gileade', 'Maputo', 'Contribuições e ofertas');