-- Create table for evangelization events
CREATE TABLE public.evangelizacao_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  frente_id UUID NOT NULL REFERENCES public.evangelizacao_frentes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  data_evento DATE NOT NULL,
  local TEXT,
  descricao TEXT,
  vidas_alcancadas INTEGER NOT NULL DEFAULT 0,
  decisoes INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evangelizacao_eventos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read for authenticated" ON public.evangelizacao_eventos FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated" ON public.evangelizacao_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for authenticated" ON public.evangelizacao_eventos FOR UPDATE USING (true);
CREATE POLICY "Allow delete for authenticated" ON public.evangelizacao_eventos FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_evangelizacao_eventos_updated_at
BEFORE UPDATE ON public.evangelizacao_eventos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();