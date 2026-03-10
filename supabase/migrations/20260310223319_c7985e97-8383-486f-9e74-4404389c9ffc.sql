
-- Table to track historical day/frequency changes for Casas Refúgio
CREATE TABLE public.casas_refugio_dia_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  casa_refugio_id uuid NOT NULL REFERENCES public.casas_refugio(id) ON DELETE CASCADE,
  dias text NOT NULL,
  frequencia text,
  vigente_desde date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_cr_dia_historico_casa ON public.casas_refugio_dia_historico(casa_refugio_id, vigente_desde);

-- Enable RLS
ALTER TABLE public.casas_refugio_dia_historico ENABLE ROW LEVEL SECURITY;

-- Same access as casas_refugio
CREATE POLICY "Authenticated users can view dia historico"
  ON public.casas_refugio_dia_historico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage dia historico"
  ON public.casas_refugio_dia_historico FOR ALL
  TO authenticated
  USING (has_full_access())
  WITH CHECK (has_full_access());

-- Seed with current data from all casas_refugio that have dias set
INSERT INTO public.casas_refugio_dia_historico (casa_refugio_id, dias, frequencia, vigente_desde)
SELECT id, dias, frequencia, COALESCE(data_inicio_cr::date, '2025-01-01')
FROM public.casas_refugio
WHERE dias IS NOT NULL;

-- Trigger to auto-log changes when dias or frequencia change
CREATE OR REPLACE FUNCTION public.log_casa_refugio_dia_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (OLD.dias IS DISTINCT FROM NEW.dias OR OLD.frequencia IS DISTINCT FROM NEW.frequencia) 
     AND NEW.dias IS NOT NULL THEN
    INSERT INTO public.casas_refugio_dia_historico (casa_refugio_id, dias, frequencia, vigente_desde)
    VALUES (NEW.id, NEW.dias, NEW.frequencia, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_dia_change
  AFTER UPDATE ON public.casas_refugio
  FOR EACH ROW
  EXECUTE FUNCTION public.log_casa_refugio_dia_change();
