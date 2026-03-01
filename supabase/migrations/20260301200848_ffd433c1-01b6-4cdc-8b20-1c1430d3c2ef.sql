
CREATE TABLE public.homepage_programacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  horario TEXT,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_programacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active programacao" ON public.homepage_programacao
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage programacao" ON public.homepage_programacao
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'pastor_geral', 'pastor_auxiliar'))
  );
