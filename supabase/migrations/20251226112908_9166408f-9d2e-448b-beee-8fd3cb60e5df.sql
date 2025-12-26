
-- Criar tabela de banco de músicas (acumula músicas já tocadas)
CREATE TABLE public.ministerio_musicas_banco (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  artista TEXT,
  tom TEXT,
  video_url TEXT,
  vezes_tocada INTEGER DEFAULT 1,
  ultima_vez_tocada DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ministry_id, titulo, artista)
);

-- Criar tabela de compartilhamento de escalas
CREATE TABLE public.ministerio_escalas_compartilhadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id UUID NOT NULL REFERENCES public.ministerio_escalas(id) ON DELETE CASCADE,
  ministry_destino_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  compartilhado_por UUID REFERENCES public.members(id),
  compartilhado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  visualizado BOOLEAN DEFAULT false,
  visualizado_em TIMESTAMP WITH TIME ZONE,
  UNIQUE(escala_id, ministry_destino_id)
);

-- Enable RLS
ALTER TABLE public.ministerio_musicas_banco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministerio_escalas_compartilhadas ENABLE ROW LEVEL SECURITY;

-- Policies for ministerio_musicas_banco
CREATE POLICY "Anyone can view ministerio_musicas_banco" 
ON public.ministerio_musicas_banco FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ministerio_musicas_banco" 
ON public.ministerio_musicas_banco FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update ministerio_musicas_banco" 
ON public.ministerio_musicas_banco FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete ministerio_musicas_banco" 
ON public.ministerio_musicas_banco FOR DELETE USING (true);

-- Policies for ministerio_escalas_compartilhadas
CREATE POLICY "Anyone can view ministerio_escalas_compartilhadas" 
ON public.ministerio_escalas_compartilhadas FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert ministerio_escalas_compartilhadas" 
ON public.ministerio_escalas_compartilhadas FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update ministerio_escalas_compartilhadas" 
ON public.ministerio_escalas_compartilhadas FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete ministerio_escalas_compartilhadas" 
ON public.ministerio_escalas_compartilhadas FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ministerio_musicas_banco_updated_at
BEFORE UPDATE ON public.ministerio_musicas_banco
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
