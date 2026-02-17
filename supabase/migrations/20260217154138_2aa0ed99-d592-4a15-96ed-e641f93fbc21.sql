
-- Add tipos_inscricao to evento (which types are allowed)
ALTER TABLE public.impacto_eventos ADD COLUMN IF NOT EXISTS tipos_inscricao text[] DEFAULT ARRAY['membro', 'nao_membro', 'familia'];

-- Add tipo_inscricao to inscricao (which type the person selected)
ALTER TABLE public.impacto_inscricoes ADD COLUMN IF NOT EXISTS tipo_inscricao text DEFAULT 'membro';
