-- Adicionar coluna observacoes na tabela novos_convertidos
ALTER TABLE public.novos_convertidos 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Comentário explicativo
COMMENT ON COLUMN public.novos_convertidos.observacoes IS 'Observações gerais sobre o novo convertido/visitante';