ALTER TABLE public.encontros_casa_refugio
  ADD CONSTRAINT encontros_casa_refugio_casa_data_unique UNIQUE (casa_refugio_id, data_encontro);