-- Adicionar campo estado_civil na tabela members
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS estado_civil TEXT DEFAULT NULL;

COMMENT ON COLUMN public.members.estado_civil IS 'Estado civil do membro: solteiro, casado, divorciado, viuvo';