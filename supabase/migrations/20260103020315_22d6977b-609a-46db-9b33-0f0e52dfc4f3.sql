-- Tabela de contribuintes de missões Moçambique
CREATE TABLE public.missoes_mocambique_contribuintes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id),
  nome_manual TEXT,
  valor_mensal NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contribuições mensais
CREATE TABLE public.missoes_mocambique_contribuicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contribuinte_id UUID NOT NULL REFERENCES public.missoes_mocambique_contribuintes(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de fechamentos mensais
CREATE TABLE public.missoes_mocambique_fechamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL UNIQUE,
  total_arrecadado NUMERIC NOT NULL DEFAULT 0,
  total_contribuintes INTEGER NOT NULL DEFAULT 0,
  cotacao_mzn NUMERIC NOT NULL DEFAULT 10.5,
  valor_convertido_mzn NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  fechado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.missoes_mocambique_contribuintes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missoes_mocambique_contribuicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missoes_mocambique_fechamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contribuintes
CREATE POLICY "Anyone can view missoes_mocambique_contribuintes" 
ON public.missoes_mocambique_contribuintes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert missoes_mocambique_contribuintes" 
ON public.missoes_mocambique_contribuintes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update missoes_mocambique_contribuintes" 
ON public.missoes_mocambique_contribuintes FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete missoes_mocambique_contribuintes" 
ON public.missoes_mocambique_contribuintes FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for contribuicoes
CREATE POLICY "Anyone can view missoes_mocambique_contribuicoes" 
ON public.missoes_mocambique_contribuicoes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert missoes_mocambique_contribuicoes" 
ON public.missoes_mocambique_contribuicoes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update missoes_mocambique_contribuicoes" 
ON public.missoes_mocambique_contribuicoes FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete missoes_mocambique_contribuicoes" 
ON public.missoes_mocambique_contribuicoes FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS Policies for fechamentos
CREATE POLICY "Anyone can view missoes_mocambique_fechamentos" 
ON public.missoes_mocambique_fechamentos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert missoes_mocambique_fechamentos" 
ON public.missoes_mocambique_fechamentos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update missoes_mocambique_fechamentos" 
ON public.missoes_mocambique_fechamentos FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete missoes_mocambique_fechamentos" 
ON public.missoes_mocambique_fechamentos FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_missoes_mocambique_contribuintes_updated_at
BEFORE UPDATE ON public.missoes_mocambique_contribuintes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missoes_mocambique_contribuicoes_updated_at
BEFORE UPDATE ON public.missoes_mocambique_contribuicoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missoes_mocambique_fechamentos_updated_at
BEFORE UPDATE ON public.missoes_mocambique_fechamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();