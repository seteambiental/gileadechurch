
-- Create table for CR Express documents
CREATE TABLE public.cr_express (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  data_culto DATE NOT NULL,
  tema TEXT NOT NULL,
  pastor_ministrador TEXT NOT NULL,
  texto_base TEXT NOT NULL,
  introducao TEXT,
  desenvolvimento TEXT,
  conclusao TEXT,
  avisos_importantes TEXT,
  arquivo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  gerado_por UUID REFERENCES public.members(id),
  aprovado_por UUID REFERENCES public.members(id),
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cr_express ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can read approved documents
CREATE POLICY "Authenticated users can read approved cr_express"
  ON public.cr_express FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert cr_express"
  ON public.cr_express FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update cr_express"
  ON public.cr_express FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cr_express"
  ON public.cr_express FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_cr_express_updated_at
  BEFORE UPDATE ON public.cr_express
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for sermon files
INSERT INTO storage.buckets (id, name, public) VALUES ('cr-express-files', 'cr-express-files', false);

CREATE POLICY "Authenticated users can upload cr-express files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cr-express-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read cr-express files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cr-express-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cr-express files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cr-express-files' AND auth.uid() IS NOT NULL);
