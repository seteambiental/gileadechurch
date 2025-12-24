-- Create enum for arrival method
CREATE TYPE public.arrival_method AS ENUM (
  'culto_domingo',
  'culto_quarta',
  'casa_refugio',
  'impacto',
  'acao_evangelistica'
);

-- Create enum for conversion type
CREATE TYPE public.conversion_type AS ENUM (
  'conversao',
  'reconciliacao'
);

-- Create table for new converts (novos convertidos)
CREATE TABLE public.novos_convertidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  whatsapp text,
  email text,
  cep text,
  address text,
  numero text,
  complement text,
  neighborhood text,
  city text,
  state text,
  
  -- Vínculo com membro existente (padrinho/madrinha)
  membro_vinculado_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  
  -- Casa Refúgio de origem
  casa_refugio_id uuid REFERENCES public.casas_refugio(id) ON DELETE SET NULL,
  
  -- Journey tracking
  tipo_conversao conversion_type,
  como_chegou arrival_method,
  data_decisao date,
  
  -- Batismo
  batizado boolean DEFAULT false,
  data_batismo date,
  
  -- Impacto
  participou_impacto boolean DEFAULT false,
  datas_impacto text[], -- Array of dates as strings
  
  -- Manaim
  participou_manaim boolean DEFAULT false,
  data_manaim date,
  
  -- Culto de Membresia
  participou_culto_membresia boolean DEFAULT false,
  data_culto_membresia date,
  
  -- Casa Refúgio (participação regular)
  frequenta_casa_refugio boolean DEFAULT false,
  casa_refugio_frequenta_id uuid REFERENCES public.casas_refugio(id) ON DELETE SET NULL,
  
  -- Status final
  tornou_membro boolean DEFAULT false,
  data_membresia date,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.novos_convertidos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view novos_convertidos"
ON public.novos_convertidos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert novos_convertidos"
ON public.novos_convertidos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update novos_convertidos"
ON public.novos_convertidos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete novos_convertidos"
ON public.novos_convertidos FOR DELETE
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_novos_convertidos_updated_at
BEFORE UPDATE ON public.novos_convertidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_novos_convertidos_membro_vinculado ON public.novos_convertidos(membro_vinculado_id);
CREATE INDEX idx_novos_convertidos_casa_refugio ON public.novos_convertidos(casa_refugio_id);
CREATE INDEX idx_novos_convertidos_tornou_membro ON public.novos_convertidos(tornou_membro);