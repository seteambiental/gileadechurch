
-- Tabela de professores do ministério de casais
CREATE TABLE public.casais_professores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marido_id UUID REFERENCES public.members(id),
  esposa_id UUID REFERENCES public.members(id),
  turma_id UUID REFERENCES public.casais_turmas(id),
  dia_semana TEXT NOT NULL,
  horario TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.casais_professores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view casais_professores"
ON public.casais_professores FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert casais_professores"
ON public.casais_professores FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update casais_professores"
ON public.casais_professores FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete casais_professores"
ON public.casais_professores FOR DELETE
USING (auth.uid() IS NOT NULL);
