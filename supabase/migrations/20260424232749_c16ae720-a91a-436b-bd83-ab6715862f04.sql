-- Tabela singleton de configuração da fila WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  batch_size INTEGER NOT NULL DEFAULT 6,
  delay_min_seconds INTEGER NOT NULL DEFAULT 5,
  delay_max_seconds INTEGER NOT NULL DEFAULT 15,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  backoff_base_minutes INTEGER NOT NULL DEFAULT 1,
  backoff_factor NUMERIC NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  CONSTRAINT whatsapp_config_singleton CHECK (id = TRUE),
  CONSTRAINT whatsapp_config_batch_range CHECK (batch_size BETWEEN 1 AND 50),
  CONSTRAINT whatsapp_config_delay_range CHECK (
    delay_min_seconds >= 1 AND delay_max_seconds >= delay_min_seconds AND delay_max_seconds <= 120
  ),
  CONSTRAINT whatsapp_config_tentativas CHECK (max_tentativas BETWEEN 1 AND 10),
  CONSTRAINT whatsapp_config_backoff CHECK (backoff_base_minutes BETWEEN 1 AND 60 AND backoff_factor BETWEEN 1 AND 20)
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins ler config whatsapp" ON public.whatsapp_config;
CREATE POLICY "Admins ler config whatsapp"
  ON public.whatsapp_config
  FOR SELECT
  TO authenticated
  USING (public.has_full_access());

DROP POLICY IF EXISTS "Admins inserir config whatsapp" ON public.whatsapp_config;
CREATE POLICY "Admins inserir config whatsapp"
  ON public.whatsapp_config
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_full_access());

DROP POLICY IF EXISTS "Admins atualizar config whatsapp" ON public.whatsapp_config;
CREATE POLICY "Admins atualizar config whatsapp"
  ON public.whatsapp_config
  FOR UPDATE
  TO authenticated
  USING (public.has_full_access())
  WITH CHECK (public.has_full_access());

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_whatsapp_config_updated_at ON public.whatsapp_config;
CREATE TRIGGER trg_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Linha padrão (singleton)
INSERT INTO public.whatsapp_config (id) VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;