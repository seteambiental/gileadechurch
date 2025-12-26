-- Create table for repertoire (songs linked to schedules/services)
CREATE TABLE public.ministerio_repertorio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id UUID NOT NULL REFERENCES public.ministerio_escalas(id) ON DELETE CASCADE,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  artista TEXT,
  tom TEXT,
  video_url TEXT,
  ordem INTEGER DEFAULT 1,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ministerio_repertorio ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view ministerio_repertorio" 
ON public.ministerio_repertorio 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert ministerio_repertorio" 
ON public.ministerio_repertorio 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update ministerio_repertorio" 
ON public.ministerio_repertorio 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete ministerio_repertorio" 
ON public.ministerio_repertorio 
FOR DELETE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ministerio_repertorio_updated_at
  BEFORE UPDATE ON public.ministerio_repertorio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Pre-populate worship ministry roles (funções específicas do louvor)
-- First we need to get the worship ministry ID or insert functions directly
INSERT INTO public.ministerio_funcoes (ministry_id, nome, descricao)
SELECT m.id, f.nome, f.descricao
FROM public.ministries m
CROSS JOIN (
  VALUES 
    ('Ministro de Louvor', 'Responsável por liderar e conduzir a adoração'),
    ('Baterista', 'Tocador de bateria'),
    ('Tecladista', 'Tocador de teclado'),
    ('Contrabaixo', 'Tocador de contrabaixo'),
    ('Guitarrista', 'Tocador de guitarra'),
    ('Violão', 'Tocador de violão'),
    ('Backing Vocal', 'Vocalista de apoio'),
    ('Percussão', 'Tocador de percussão')
) AS f(nome, descricao)
WHERE m.name ILIKE '%louvor%'
ON CONFLICT DO NOTHING;