
-- Tabela de alunos do Curso de Teologia
CREATE TABLE public.teologia_alunos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id)
);

-- Tabela de pagamentos do Curso de Teologia
CREATE TABLE public.teologia_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id UUID NOT NULL REFERENCES public.teologia_alunos(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  observacoes TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.teologia_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teologia_pagamentos ENABLE ROW LEVEL SECURITY;

-- Policies for teologia_alunos
CREATE POLICY "Admins can manage teologia_alunos" ON public.teologia_alunos
  FOR ALL USING (public.has_full_access());

CREATE POLICY "Members can view own teologia_alunos" ON public.teologia_alunos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = teologia_alunos.member_id AND m.user_id = auth.uid())
  );

-- Policies for teologia_pagamentos
CREATE POLICY "Admins can manage teologia_pagamentos" ON public.teologia_pagamentos
  FOR ALL USING (public.has_full_access());

CREATE POLICY "Members can view own teologia_pagamentos" ON public.teologia_pagamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teologia_alunos ta
      INNER JOIN public.members m ON m.id = ta.member_id
      WHERE ta.id = teologia_pagamentos.aluno_id AND m.user_id = auth.uid()
    )
  );

-- Triggers
CREATE TRIGGER update_teologia_alunos_updated_at
  BEFORE UPDATE ON public.teologia_alunos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
