ALTER TABLE public.evento_emergencia_config
  ADD COLUMN IF NOT EXISTS recorrencia_tipo text NOT NULL DEFAULT 'semana',
  ADD COLUMN IF NOT EXISTS recorrencia_dias_semana integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  ADD COLUMN IF NOT EXISTS recorrencia_meses integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  ADD COLUMN IF NOT EXISTS recorrencia_semana_ordinal text,
  ADD COLUMN IF NOT EXISTS recorrencia_dia_semana integer,
  ADD COLUMN IF NOT EXISTS recorrencia_hora time NOT NULL DEFAULT '08:00';

ALTER TABLE public.evento_emergencia_config
  DROP CONSTRAINT IF EXISTS evento_emergencia_config_recorrencia_tipo_check;
ALTER TABLE public.evento_emergencia_config
  ADD CONSTRAINT evento_emergencia_config_recorrencia_tipo_check
  CHECK (recorrencia_tipo IN ('dia','semana','mes'));

ALTER TABLE public.evento_emergencia_config
  DROP CONSTRAINT IF EXISTS evento_emergencia_config_recorrencia_ordinal_check;
ALTER TABLE public.evento_emergencia_config
  ADD CONSTRAINT evento_emergencia_config_recorrencia_ordinal_check
  CHECK (recorrencia_semana_ordinal IS NULL OR recorrencia_semana_ordinal IN ('primeiro','segundo','terceiro','quarto','ultimo'));

ALTER TABLE public.mensagens_evento_templates
  DROP CONSTRAINT IF EXISTS mensagens_evento_templates_tipo_mensagem_check;
ALTER TABLE public.mensagens_evento_templates
  ADD CONSTRAINT mensagens_evento_templates_tipo_mensagem_check
  CHECK (tipo_mensagem IN ('confirmacao_inscricao','inscricao_recebida','lembrete_pagamento','vaga_liberada','contato_emergencia'));