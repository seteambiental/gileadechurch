
-- Tabela de pagamentos do curso de casais
CREATE TABLE public.casais_pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  casal_id UUID REFERENCES public.casais_inscritos(id) ON DELETE CASCADE NOT NULL,
  turma_id UUID REFERENCES public.casais_turmas(id) ON DELETE SET NULL,
  valor NUMERIC NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_pagamento DATE,
  data_previsao DATE,
  mes_referencia TEXT,
  observacoes TEXT,
  registrado_por UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add terms columns to casais_inscritos
ALTER TABLE public.casais_inscritos 
  ADD COLUMN IF NOT EXISTS aceite_imagem BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS aceite_confidencialidade BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.casais_pagamentos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view casais_pagamentos"
  ON public.casais_pagamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and leaders can insert casais_pagamentos"
  ON public.casais_pagamentos FOR INSERT TO authenticated
  WITH CHECK (has_full_access() OR is_lider_ministerio());

CREATE POLICY "Admins and leaders can update casais_pagamentos"
  ON public.casais_pagamentos FOR UPDATE TO authenticated
  USING (has_full_access() OR is_lider_ministerio())
  WITH CHECK (has_full_access() OR is_lider_ministerio());

CREATE POLICY "Admins can delete casais_pagamentos"
  ON public.casais_pagamentos FOR DELETE TO authenticated
  USING (has_full_access());
