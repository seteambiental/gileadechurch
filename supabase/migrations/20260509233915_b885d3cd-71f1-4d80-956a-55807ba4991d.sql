
ALTER TABLE public.evento_emergencia_config
  ADD COLUMN IF NOT EXISTS modo_envio TEXT NOT NULL DEFAULT 'recorrente',
  ADD COLUMN IF NOT EXISTS data_envio_unico TIMESTAMPTZ;
