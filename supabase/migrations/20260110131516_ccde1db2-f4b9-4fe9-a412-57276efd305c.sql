-- Tabela para avisos avulsos da homepage
CREATE TABLE public.homepage_avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data TEXT,
  horario TEXT,
  tipo TEXT NOT NULL DEFAULT 'info' CHECK (tipo IN ('event', 'urgent', 'info')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para configurações do hero da homepage
CREATE TABLE public.homepage_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hero_titulo TEXT NOT NULL DEFAULT 'Um Lugar de Cura e Restauração',
  hero_subtitulo TEXT,
  hero_image_url TEXT,
  lema TEXT NOT NULL DEFAULT 'Um lugar de cura e restauração',
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  tiktok TEXT,
  twitter TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.homepage_config (hero_titulo, hero_subtitulo, lema, instagram)
VALUES (
  'Um Lugar de Cura e Restauração',
  'Venha fazer parte de uma comunidade que vive o amor de Cristo. Aqui você encontra acolhimento, crescimento espiritual e propósito.',
  'Um lugar de cura e restauração',
  'https://instagram.com/gileadechurch'
);

-- Enable RLS
ALTER TABLE public.homepage_avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública (homepage precisa ser acessível a todos)
CREATE POLICY "Homepage avisos são públicos para leitura"
ON public.homepage_avisos FOR SELECT
USING (true);

CREATE POLICY "Homepage config é público para leitura"
ON public.homepage_config FOR SELECT
USING (true);

-- Policies para edição apenas por usuários autenticados
CREATE POLICY "Apenas autenticados podem inserir avisos"
ON public.homepage_avisos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Apenas autenticados podem atualizar avisos"
ON public.homepage_avisos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Apenas autenticados podem deletar avisos"
ON public.homepage_avisos FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Apenas autenticados podem atualizar config"
ON public.homepage_config FOR UPDATE
TO authenticated
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_homepage_avisos_updated_at
BEFORE UPDATE ON public.homepage_avisos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homepage_config_updated_at
BEFORE UPDATE ON public.homepage_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();