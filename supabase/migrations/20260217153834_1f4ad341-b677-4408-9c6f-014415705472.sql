
-- Add pagamentos column to store multiple payment entries as JSON array
-- Each entry: { tipo: string, valor: number }
ALTER TABLE public.impacto_inscricoes ADD COLUMN IF NOT EXISTS pagamentos jsonb DEFAULT '[]'::jsonb;
