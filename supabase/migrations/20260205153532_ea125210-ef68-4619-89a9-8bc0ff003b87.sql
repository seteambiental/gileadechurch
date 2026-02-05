-- Criar tabela para carrossel da homepage
CREATE TABLE public.homepage_carrossel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  imagem_url TEXT NOT NULL,
  link_url TEXT,
  ordem INTEGER NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_carrossel ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Qualquer pessoa pode ver carrossel ativo"
ON public.homepage_carrossel
FOR SELECT
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ver todo carrossel"
ON public.homepage_carrossel
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir carrossel"
ON public.homepage_carrossel
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar carrossel"
ON public.homepage_carrossel
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar carrossel"
ON public.homepage_carrossel
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_homepage_carrossel_updated_at
BEFORE UPDATE ON public.homepage_carrossel
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();