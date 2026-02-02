-- Adiciona campo estado_civil à tabela member_requests
ALTER TABLE public.member_requests ADD COLUMN IF NOT EXISTS estado_civil text;

-- Adiciona campo estado_civil à tabela members para persistir após aprovação
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS estado_civil text;