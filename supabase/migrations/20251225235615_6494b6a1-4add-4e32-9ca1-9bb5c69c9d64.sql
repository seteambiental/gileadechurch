-- Criar tabela de escalas do Kids
CREATE TABLE public.kids_escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_culto DATE NOT NULL,
  tipo_culto TEXT NOT NULL DEFAULT 'domingo',
  turma public.kids_turma NOT NULL,
  lider_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes TEXT,
  UNIQUE(data_culto, tipo_culto, turma)
);

-- Criar tabela de ajudantes na escala (relacionamento N:N)
CREATE TABLE public.kids_escalas_ajudantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id UUID NOT NULL REFERENCES public.kids_escalas(id) ON DELETE CASCADE,
  ajudante_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(escala_id, ajudante_id)
);

-- Enable RLS
ALTER TABLE public.kids_escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_escalas_ajudantes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kids_escalas
CREATE POLICY "Authenticated users can view kids_escalas"
ON public.kids_escalas FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert kids_escalas"
ON public.kids_escalas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update kids_escalas"
ON public.kids_escalas FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete kids_escalas"
ON public.kids_escalas FOR DELETE
USING (true);

-- RLS Policies for kids_escalas_ajudantes
CREATE POLICY "Authenticated users can view kids_escalas_ajudantes"
ON public.kids_escalas_ajudantes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert kids_escalas_ajudantes"
ON public.kids_escalas_ajudantes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update kids_escalas_ajudantes"
ON public.kids_escalas_ajudantes FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete kids_escalas_ajudantes"
ON public.kids_escalas_ajudantes FOR DELETE
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_kids_escalas_updated_at
BEFORE UPDATE ON public.kids_escalas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();