
-- Tornar funcao_id opcional na tabela ministerio_integrantes
ALTER TABLE public.ministerio_integrantes ALTER COLUMN funcao_id DROP NOT NULL;
