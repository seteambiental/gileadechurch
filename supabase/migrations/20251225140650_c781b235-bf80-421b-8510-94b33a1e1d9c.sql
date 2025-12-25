-- Adicionar campos para armazenar dados do responsável quando não há membro correspondente
ALTER TABLE public.novos_convertidos 
ADD COLUMN IF NOT EXISTS responsavel_nome text,
ADD COLUMN IF NOT EXISTS responsavel_whatsapp text;