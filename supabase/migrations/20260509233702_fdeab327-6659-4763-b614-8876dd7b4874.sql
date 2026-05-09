
ALTER TABLE public.evento_emergencia_config
  ADD COLUMN IF NOT EXISTS tipo_mensagem TEXT NOT NULL DEFAULT 'contato_emergencia';

ALTER TABLE public.evento_emergencia_config
  DROP CONSTRAINT IF EXISTS evento_emergencia_config_evento_id_evento_tipo_key;

ALTER TABLE public.evento_emergencia_config
  DROP CONSTRAINT IF EXISTS evento_emergencia_config_evento_id_evento_tipo_tipo_mensagem_key;

ALTER TABLE public.evento_emergencia_config
  ADD CONSTRAINT evento_emergencia_config_evento_id_evento_tipo_tipo_mensagem_key
  UNIQUE (evento_id, evento_tipo, tipo_mensagem);
