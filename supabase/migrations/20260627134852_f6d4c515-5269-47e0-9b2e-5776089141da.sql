CREATE UNIQUE INDEX IF NOT EXISTS encontros_casa_refugio_casa_data_uniq
  ON public.encontros_casa_refugio (casa_refugio_id, data_encontro);