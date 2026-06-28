CREATE TABLE public.contagem_cultos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT 'Culto',
  tipo_culto TEXT NOT NULL DEFAULT 'domingo',
  data DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  entradas INTEGER NOT NULL DEFAULT 0,
  saidas INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  meta INTEGER,
  token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contagem_cultos TO authenticated;
GRANT SELECT ON public.contagem_cultos TO anon;
GRANT ALL ON public.contagem_cultos TO service_role;

ALTER TABLE public.contagem_cultos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver contagem de cultos"
  ON public.contagem_cultos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Anon pode ver contagem de cultos"
  ON public.contagem_cultos FOR SELECT
  TO anon USING (true);

CREATE POLICY "Admins e pastores gerenciam contagem de cultos"
  ON public.contagem_cultos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pastor_geral'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pastor_geral'));

CREATE TRIGGER update_contagem_cultos_updated_at
  BEFORE UPDATE ON public.contagem_cultos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contagem_cultos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contagem_cultos;