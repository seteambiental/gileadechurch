
CREATE TABLE public.impacto_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.impacto_eventos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.impacto_despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view despesas" ON public.impacto_despesas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin/master can insert despesas" ON public.impacto_despesas FOR INSERT WITH CHECK (has_full_access());
CREATE POLICY "Admin/master can update despesas" ON public.impacto_despesas FOR UPDATE USING (has_full_access());
CREATE POLICY "Admin/master can delete despesas" ON public.impacto_despesas FOR DELETE USING (has_full_access());

CREATE TRIGGER update_impacto_despesas_updated_at BEFORE UPDATE ON public.impacto_despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
