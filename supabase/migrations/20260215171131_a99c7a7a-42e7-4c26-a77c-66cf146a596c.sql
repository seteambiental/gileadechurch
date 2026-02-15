-- Adicionar coluna de visibilidade à tabela agenda_igreja
-- 'publico' = aberto ao público (vai para aba Eventos)
-- 'interno' = interno da igreja (vai para aba Programação)
-- 'casa_refugio' = apenas para o grupo do líder (vai para aba Programação)
ALTER TABLE public.agenda_igreja ADD COLUMN visibilidade text NOT NULL DEFAULT 'publico';

-- Definir eventos existentes como públicos por padrão
COMMENT ON COLUMN public.agenda_igreja.visibilidade IS 'publico, interno, casa_refugio';