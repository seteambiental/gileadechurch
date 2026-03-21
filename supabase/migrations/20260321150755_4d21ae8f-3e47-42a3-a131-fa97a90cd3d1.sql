
CREATE TABLE public.teologia_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teologia_despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teologia_despesas" ON public.teologia_despesas
  FOR ALL TO authenticated
  USING (public.has_full_access())
  WITH CHECK (public.has_full_access());

CREATE POLICY "Authenticated can read teologia_despesas" ON public.teologia_despesas
  FOR SELECT TO authenticated
  USING (true);
