
-- Tabela de Famílias
CREATE TABLE public.acao_social_familias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_familia TEXT NOT NULL,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  renda_total NUMERIC DEFAULT 0,
  casa_refugio_id UUID REFERENCES public.casas_refugio(id),
  lider_responsavel_id UUID REFERENCES public.members(id),
  tipo_ajuda TEXT,
  frequencia_ajuda TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Membros da Família
CREATE TABLE public.acao_social_familia_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  familia_id UUID NOT NULL REFERENCES public.acao_social_familias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  genero TEXT,
  parentesco TEXT,
  profissao TEXT,
  local_trabalho TEXT,
  salario NUMERIC DEFAULT 0,
  trabalha BOOLEAN DEFAULT false,
  escolaridade TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Instituições
CREATE TABLE public.acao_social_instituicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  tipo_instituicao TEXT NOT NULL,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  responsavel_nome TEXT,
  responsavel_telefone TEXT,
  tipo_ajuda TEXT,
  frequencia_ajuda TEXT,
  quantidade_atendidos INTEGER DEFAULT 0,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Registro de Ajudas
CREATE TABLE public.acao_social_ajudas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  familia_id UUID REFERENCES public.acao_social_familias(id) ON DELETE CASCADE,
  instituicao_id UUID REFERENCES public.acao_social_instituicoes(id) ON DELETE CASCADE,
  data_ajuda DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_ajuda TEXT NOT NULL,
  valor NUMERIC,
  quantidade_kilos NUMERIC,
  quantidade_cestas INTEGER,
  quantidade_itens INTEGER,
  descricao TEXT,
  registrado_por UUID REFERENCES public.members(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_familia_or_instituicao CHECK (
    (familia_id IS NOT NULL AND instituicao_id IS NULL) OR
    (familia_id IS NULL AND instituicao_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.acao_social_familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acao_social_familia_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acao_social_instituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acao_social_ajudas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for acao_social_familias
CREATE POLICY "Authenticated users can view acao_social_familias" ON public.acao_social_familias FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert acao_social_familias" ON public.acao_social_familias FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update acao_social_familias" ON public.acao_social_familias FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete acao_social_familias" ON public.acao_social_familias FOR DELETE USING (true);

-- RLS Policies for acao_social_familia_membros
CREATE POLICY "Authenticated users can view acao_social_familia_membros" ON public.acao_social_familia_membros FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert acao_social_familia_membros" ON public.acao_social_familia_membros FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update acao_social_familia_membros" ON public.acao_social_familia_membros FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete acao_social_familia_membros" ON public.acao_social_familia_membros FOR DELETE USING (true);

-- RLS Policies for acao_social_instituicoes
CREATE POLICY "Authenticated users can view acao_social_instituicoes" ON public.acao_social_instituicoes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert acao_social_instituicoes" ON public.acao_social_instituicoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update acao_social_instituicoes" ON public.acao_social_instituicoes FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete acao_social_instituicoes" ON public.acao_social_instituicoes FOR DELETE USING (true);

-- RLS Policies for acao_social_ajudas
CREATE POLICY "Authenticated users can view acao_social_ajudas" ON public.acao_social_ajudas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert acao_social_ajudas" ON public.acao_social_ajudas FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update acao_social_ajudas" ON public.acao_social_ajudas FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete acao_social_ajudas" ON public.acao_social_ajudas FOR DELETE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_acao_social_familias_updated_at
  BEFORE UPDATE ON public.acao_social_familias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_acao_social_familia_membros_updated_at
  BEFORE UPDATE ON public.acao_social_familia_membros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_acao_social_instituicoes_updated_at
  BEFORE UPDATE ON public.acao_social_instituicoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_acao_social_ajudas_updated_at
  BEFORE UPDATE ON public.acao_social_ajudas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
