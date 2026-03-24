
-- Tabela de despesas do Curso de Casais
CREATE TABLE public.casais_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de despesas do Jiu-Jitsu
CREATE TABLE public.jiujitsu_despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.casais_despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jiujitsu_despesas ENABLE ROW LEVEL SECURITY;

-- RLS policies for casais_despesas
CREATE POLICY "Admins and pastors can manage casais despesas" ON public.casais_despesas
  FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());

CREATE POLICY "Líderes ministerio can manage casais despesas" ON public.casais_despesas
  FOR ALL TO authenticated USING (is_lider_ministerio()) WITH CHECK (is_lider_ministerio());

-- RLS policies for jiujitsu_despesas
CREATE POLICY "Admins and pastors can manage jiujitsu despesas" ON public.jiujitsu_despesas
  FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());

CREATE POLICY "Líderes ministerio can manage jiujitsu despesas" ON public.jiujitsu_despesas
  FOR ALL TO authenticated USING (is_lider_ministerio()) WITH CHECK (is_lider_ministerio());

-- Triggers for updated_at
CREATE TRIGGER update_casais_despesas_updated_at BEFORE UPDATE ON public.casais_despesas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jiujitsu_despesas_updated_at BEFORE UPDATE ON public.jiujitsu_despesas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
