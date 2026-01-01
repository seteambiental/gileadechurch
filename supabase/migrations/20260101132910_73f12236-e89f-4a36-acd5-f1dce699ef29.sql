-- Tabela de turmas do curso de casais
CREATE TABLE public.casais_turmas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  horario TEXT,
  local TEXT,
  vagas INTEGER DEFAULT 20,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de líderes do curso de casais
CREATE TABLE public.casais_lideres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID REFERENCES public.casais_turmas(id) ON DELETE CASCADE,
  membro_masculino_id UUID REFERENCES public.members(id),
  membro_feminino_id UUID REFERENCES public.members(id),
  funcao TEXT DEFAULT 'lider',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de casais inscritos
CREATE TABLE public.casais_inscritos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID NOT NULL REFERENCES public.casais_turmas(id) ON DELETE CASCADE,
  membro_masculino_id UUID REFERENCES public.members(id),
  membro_feminino_id UUID REFERENCES public.members(id),
  nome_masculino TEXT,
  nome_feminino TEXT,
  whatsapp_masculino TEXT,
  whatsapp_feminino TEXT,
  data_casamento DATE,
  tempo_casamento TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'ativo',
  certificado_emitido BOOLEAN DEFAULT false,
  data_certificado DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de materiais do curso
CREATE TABLE public.casais_materiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma_id UUID REFERENCES public.casais_turmas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'documento',
  url TEXT,
  ordem INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de presenças do curso
CREATE TABLE public.casais_presencas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  casal_id UUID NOT NULL REFERENCES public.casais_inscritos(id) ON DELETE CASCADE,
  data_aula DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.casais_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casais_lideres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casais_inscritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casais_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casais_presencas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for casais_turmas
CREATE POLICY "Anyone can view casais_turmas" ON public.casais_turmas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert casais_turmas" ON public.casais_turmas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update casais_turmas" ON public.casais_turmas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete casais_turmas" ON public.casais_turmas FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for casais_lideres
CREATE POLICY "Anyone can view casais_lideres" ON public.casais_lideres FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert casais_lideres" ON public.casais_lideres FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update casais_lideres" ON public.casais_lideres FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete casais_lideres" ON public.casais_lideres FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for casais_inscritos
CREATE POLICY "Anyone can view casais_inscritos" ON public.casais_inscritos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert casais_inscritos" ON public.casais_inscritos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update casais_inscritos" ON public.casais_inscritos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete casais_inscritos" ON public.casais_inscritos FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for casais_materiais
CREATE POLICY "Anyone can view casais_materiais" ON public.casais_materiais FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert casais_materiais" ON public.casais_materiais FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update casais_materiais" ON public.casais_materiais FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete casais_materiais" ON public.casais_materiais FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for casais_presencas
CREATE POLICY "Anyone can view casais_presencas" ON public.casais_presencas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert casais_presencas" ON public.casais_presencas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update casais_presencas" ON public.casais_presencas FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete casais_presencas" ON public.casais_presencas FOR DELETE USING (auth.uid() IS NOT NULL);