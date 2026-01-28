-- Tabela para banco de músicas com letras e cifras
CREATE TABLE public.louvor_musicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  artista TEXT,
  tom TEXT,
  bpm INTEGER,
  letra TEXT,
  cifra TEXT,
  video_url TEXT,
  audio_url TEXT,
  categoria TEXT DEFAULT 'adoracao',
  tags TEXT[],
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.louvor_musicas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view louvor_musicas"
  ON public.louvor_musicas FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert louvor_musicas"
  ON public.louvor_musicas FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update louvor_musicas"
  ON public.louvor_musicas FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete louvor_musicas"
  ON public.louvor_musicas FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_louvor_musicas_updated_at
  BEFORE UPDATE ON public.louvor_musicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para busca
CREATE INDEX idx_louvor_musicas_titulo ON public.louvor_musicas(titulo);
CREATE INDEX idx_louvor_musicas_artista ON public.louvor_musicas(artista);
CREATE INDEX idx_louvor_musicas_categoria ON public.louvor_musicas(categoria);