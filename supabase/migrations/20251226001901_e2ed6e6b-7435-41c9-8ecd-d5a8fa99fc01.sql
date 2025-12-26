-- Tabela de configuração de funções por ministério
CREATE TABLE public.ministerio_funcoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ministry_id, nome)
);

-- Tabela de integrantes do ministério
CREATE TABLE public.ministerio_integrantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  funcao_id UUID NOT NULL REFERENCES public.ministerio_funcoes(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ministry_id, member_id, funcao_id)
);

-- Tabela de escalas do ministério
CREATE TABLE public.ministerio_escalas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  data_culto DATE NOT NULL,
  tipo_culto TEXT NOT NULL DEFAULT 'domingo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de membros escalados (múltiplos por escala)
CREATE TABLE public.ministerio_escala_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id UUID NOT NULL REFERENCES public.ministerio_escalas(id) ON DELETE CASCADE,
  integrante_id UUID NOT NULL REFERENCES public.ministerio_integrantes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(escala_id, integrante_id)
);

-- Enable RLS
ALTER TABLE public.ministerio_funcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministerio_integrantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministerio_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministerio_escala_membros ENABLE ROW LEVEL SECURITY;

-- Políticas para ministerio_funcoes
CREATE POLICY "Anyone can view ministerio_funcoes" ON public.ministerio_funcoes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ministerio_funcoes" ON public.ministerio_funcoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update ministerio_funcoes" ON public.ministerio_funcoes FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete ministerio_funcoes" ON public.ministerio_funcoes FOR DELETE USING (true);

-- Políticas para ministerio_integrantes
CREATE POLICY "Anyone can view ministerio_integrantes" ON public.ministerio_integrantes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ministerio_integrantes" ON public.ministerio_integrantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update ministerio_integrantes" ON public.ministerio_integrantes FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete ministerio_integrantes" ON public.ministerio_integrantes FOR DELETE USING (true);

-- Políticas para ministerio_escalas
CREATE POLICY "Anyone can view ministerio_escalas" ON public.ministerio_escalas FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ministerio_escalas" ON public.ministerio_escalas FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update ministerio_escalas" ON public.ministerio_escalas FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete ministerio_escalas" ON public.ministerio_escalas FOR DELETE USING (true);

-- Políticas para ministerio_escala_membros
CREATE POLICY "Anyone can view ministerio_escala_membros" ON public.ministerio_escala_membros FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ministerio_escala_membros" ON public.ministerio_escala_membros FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update ministerio_escala_membros" ON public.ministerio_escala_membros FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete ministerio_escala_membros" ON public.ministerio_escala_membros FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_ministerio_funcoes_updated_at
  BEFORE UPDATE ON public.ministerio_funcoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ministerio_integrantes_updated_at
  BEFORE UPDATE ON public.ministerio_integrantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ministerio_escalas_updated_at
  BEFORE UPDATE ON public.ministerio_escalas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();