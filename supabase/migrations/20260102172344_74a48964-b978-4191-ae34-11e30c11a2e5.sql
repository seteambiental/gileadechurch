-- Create table for evangelization work fronts
CREATE TABLE public.evangelizacao_frentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  lider_id UUID REFERENCES public.members(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for members in work fronts
CREATE TABLE public.evangelizacao_frentes_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frente_id UUID NOT NULL REFERENCES public.evangelizacao_frentes(id) ON DELETE CASCADE,
  membro_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  funcao TEXT DEFAULT 'membro',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(frente_id, membro_id)
);

-- Enable RLS
ALTER TABLE public.evangelizacao_frentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evangelizacao_frentes_membros ENABLE ROW LEVEL SECURITY;

-- Policies for frentes
CREATE POLICY "Allow read access for authenticated users" ON public.evangelizacao_frentes FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.evangelizacao_frentes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.evangelizacao_frentes FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated users" ON public.evangelizacao_frentes FOR DELETE USING (true);

-- Policies for frentes_membros
CREATE POLICY "Allow read access for authenticated users" ON public.evangelizacao_frentes_membros FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.evangelizacao_frentes_membros FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated users" ON public.evangelizacao_frentes_membros FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated users" ON public.evangelizacao_frentes_membros FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_evangelizacao_frentes_updated_at
BEFORE UPDATE ON public.evangelizacao_frentes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();