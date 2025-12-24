-- Adicionar campo para controlar lista de espera nas inscrições
ALTER TABLE public.inscricoes_eventos 
ADD COLUMN lista_espera BOOLEAN DEFAULT false;