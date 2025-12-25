-- Add RG and CPF fields to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Add RG and CPF fields to novos_convertidos table
ALTER TABLE public.novos_convertidos ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE public.novos_convertidos ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Add RG and CPF fields to inscricoes_eventos table
ALTER TABLE public.inscricoes_eventos ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE public.inscricoes_eventos ADD COLUMN IF NOT EXISTS cpf TEXT;