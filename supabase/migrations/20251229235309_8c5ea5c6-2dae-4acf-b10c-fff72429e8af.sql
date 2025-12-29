-- Tabela para armazenar os IDs dos rostos indexados no AWS Rekognition
CREATE TABLE public.member_face_indexes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  novo_convertido_id UUID REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  face_id VARCHAR(255) NOT NULL,
  external_image_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT member_or_novo_convertido CHECK (
    (member_id IS NOT NULL AND novo_convertido_id IS NULL) OR
    (member_id IS NULL AND novo_convertido_id IS NOT NULL)
  )
);

-- Tabela para armazenar análise de presença por foto
CREATE TABLE public.encontro_presencas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  encontro_id UUID NOT NULL REFERENCES public.encontros_casa_refugio(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  novo_convertido_id UUID REFERENCES public.novos_convertidos(id) ON DELETE SET NULL,
  presente BOOLEAN NOT NULL DEFAULT false,
  confidence DECIMAL(5,2),
  mensagem_ausencia_enviada BOOLEAN NOT NULL DEFAULT false,
  mensagem_enviada_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT member_or_nc_presenca CHECK (
    (member_id IS NOT NULL AND novo_convertido_id IS NULL) OR
    (member_id IS NULL AND novo_convertido_id IS NOT NULL)
  )
);

-- Índices para performance
CREATE INDEX idx_member_face_indexes_member_id ON public.member_face_indexes(member_id);
CREATE INDEX idx_member_face_indexes_novo_convertido_id ON public.member_face_indexes(novo_convertido_id);
CREATE INDEX idx_member_face_indexes_face_id ON public.member_face_indexes(face_id);
CREATE INDEX idx_encontro_presencas_encontro_id ON public.encontro_presencas(encontro_id);
CREATE INDEX idx_encontro_presencas_member_id ON public.encontro_presencas(member_id);

-- Enable RLS
ALTER TABLE public.member_face_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encontro_presencas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acesso para usuários autenticados)
CREATE POLICY "Authenticated users can manage face indexes"
ON public.member_face_indexes FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage presencas"
ON public.encontro_presencas FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_member_face_indexes_updated_at
BEFORE UPDATE ON public.member_face_indexes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();