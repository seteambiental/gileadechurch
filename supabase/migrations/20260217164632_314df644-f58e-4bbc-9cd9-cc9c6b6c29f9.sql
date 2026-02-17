
-- Add prefixo_referencia to impacto_eventos
ALTER TABLE public.impacto_eventos ADD COLUMN prefixo_referencia TEXT;

-- Add referencia to impacto_inscricoes
ALTER TABLE public.impacto_inscricoes ADD COLUMN referencia TEXT;

-- Add unique constraint on referencia
ALTER TABLE public.impacto_inscricoes ADD CONSTRAINT impacto_inscricoes_referencia_unique UNIQUE (referencia);

-- Function to auto-generate referencia on insert
CREATE OR REPLACE FUNCTION public.generate_impacto_referencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefixo TEXT;
  ano TEXT;
  seq INT;
  nova_ref TEXT;
BEGIN
  -- Only generate if referencia is not already set
  IF NEW.referencia IS NOT NULL AND NEW.referencia != '' THEN
    RETURN NEW;
  END IF;

  -- Get prefix from the event
  SELECT e.prefixo_referencia INTO prefixo
  FROM public.impacto_eventos e
  WHERE e.id = NEW.evento_id;

  -- If no prefix configured, skip
  IF prefixo IS NULL OR prefixo = '' THEN
    RETURN NEW;
  END IF;

  -- Get year from event start date
  SELECT EXTRACT(YEAR FROM e.data_inicio)::TEXT INTO ano
  FROM public.impacto_eventos e
  WHERE e.id = NEW.evento_id;

  -- Get next sequence number for this event
  SELECT COALESCE(MAX(
    CASE 
      WHEN i.referencia ~ ('^' || prefixo || '-[0-9]+-' || ano || '$')
      THEN SPLIT_PART(i.referencia, '-', 2)::INT
      ELSE 0
    END
  ), 0) + 1 INTO seq
  FROM public.impacto_inscricoes i
  WHERE i.evento_id = NEW.evento_id
    AND i.referencia IS NOT NULL;

  -- Format: PREFIX-XXX-YYYY
  nova_ref := prefixo || '-' || LPAD(seq::TEXT, 3, '0') || '-' || ano;
  NEW.referencia := nova_ref;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trg_generate_impacto_referencia
BEFORE INSERT ON public.impacto_inscricoes
FOR EACH ROW
EXECUTE FUNCTION public.generate_impacto_referencia();
