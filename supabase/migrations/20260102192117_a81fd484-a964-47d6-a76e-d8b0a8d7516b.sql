-- Create impacto_eventos table
CREATE TABLE public.impacto_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  tipo TEXT NOT NULL, -- mulheres, homens, criancas, jovens, adolescentes, casais
  local TEXT,
  descricao TEXT,
  valor_inscricao NUMERIC DEFAULT 0,
  limite_vagas INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create impacto_departamentos table (departments for each event)
CREATE TABLE public.impacto_departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.impacto_eventos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- logistica, correio, ministradores, apoio, teatro, cozinha, financeiro
  lider_id UUID REFERENCES public.members(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create impacto_equipe_membros table (team members per department)
CREATE TABLE public.impacto_equipe_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departamento_id UUID NOT NULL REFERENCES public.impacto_departamentos(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id),
  nome_manual TEXT,
  funcao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create impacto_inscricoes table
CREATE TABLE public.impacto_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.impacto_eventos(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  genero TEXT,
  data_nascimento DATE,
  observacoes TEXT,
  valor_pago NUMERIC DEFAULT 0,
  status_pagamento TEXT NOT NULL DEFAULT 'pendente', -- pendente, parcial, pago
  forma_pagamento TEXT,
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impacto_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impacto_departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impacto_equipe_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impacto_inscricoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for impacto_eventos
CREATE POLICY "Anyone can view impacto_eventos" ON public.impacto_eventos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert impacto_eventos" ON public.impacto_eventos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update impacto_eventos" ON public.impacto_eventos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete impacto_eventos" ON public.impacto_eventos FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for impacto_departamentos
CREATE POLICY "Anyone can view impacto_departamentos" ON public.impacto_departamentos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert impacto_departamentos" ON public.impacto_departamentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update impacto_departamentos" ON public.impacto_departamentos FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete impacto_departamentos" ON public.impacto_departamentos FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for impacto_equipe_membros
CREATE POLICY "Anyone can view impacto_equipe_membros" ON public.impacto_equipe_membros FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert impacto_equipe_membros" ON public.impacto_equipe_membros FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update impacto_equipe_membros" ON public.impacto_equipe_membros FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete impacto_equipe_membros" ON public.impacto_equipe_membros FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for impacto_inscricoes
CREATE POLICY "Anyone can view impacto_inscricoes" ON public.impacto_inscricoes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert impacto_inscricoes" ON public.impacto_inscricoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update impacto_inscricoes" ON public.impacto_inscricoes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete impacto_inscricoes" ON public.impacto_inscricoes FOR DELETE USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_impacto_eventos_updated_at BEFORE UPDATE ON public.impacto_eventos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_impacto_departamentos_updated_at BEFORE UPDATE ON public.impacto_departamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_impacto_inscricoes_updated_at BEFORE UPDATE ON public.impacto_inscricoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();