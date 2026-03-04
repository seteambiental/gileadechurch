
-- Add finalization fields to impacto_eventos
ALTER TABLE public.impacto_eventos 
  ADD COLUMN IF NOT EXISTS finalizado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS finalizado_por uuid REFERENCES auth.users(id);

-- Index for quick filtering
CREATE INDEX IF NOT EXISTS idx_impacto_eventos_finalizado ON public.impacto_eventos(finalizado);
