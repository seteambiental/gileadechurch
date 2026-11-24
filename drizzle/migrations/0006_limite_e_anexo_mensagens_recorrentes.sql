ALTER TABLE public.evento_emergencia_config
  ADD COLUMN data_fim_recorrencia date,
  ADD COLUMN midia_recorrente_url text,
  ADD COLUMN midia_recorrente_nome text;

ALTER TABLE public.evento_emergencia_config
  ADD CONSTRAINT evento_emergencia_config_periodo_valido
  CHECK (
    data_fim_recorrencia IS NULL
    OR data_inicio_recorrencia IS NULL
    OR data_fim_recorrencia >= data_inicio_recorrencia
  );

COMMENT ON COLUMN public.evento_emergencia_config.data_fim_recorrencia IS 'Último dia, inclusive, em que a mensagem recorrente pode ser enviada.';
COMMENT ON COLUMN public.evento_emergencia_config.midia_recorrente_url IS 'URL pública da imagem, vídeo ou documento anexado à mensagem recorrente.';
COMMENT ON COLUMN public.evento_emergencia_config.midia_recorrente_nome IS 'Nome original do anexo da mensagem recorrente.';