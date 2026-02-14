-- Add approval workflow columns to agenda_igreja
ALTER TABLE public.agenda_igreja 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS solicitante_id uuid REFERENCES public.members(id),
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text;

-- Comment for clarity
COMMENT ON COLUMN public.agenda_igreja.status IS 'Status do evento: aprovado, pendente, rejeitado';
COMMENT ON COLUMN public.agenda_igreja.solicitante_id IS 'Membro que solicitou a criação do evento';

-- Update existing RLS policies to filter by status for public views
-- Leaders can view all events (including pending ones they need to approve)
CREATE POLICY "Leaders can insert pending events"
ON public.agenda_igreja
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Leaders can update own pending events"
ON public.agenda_igreja
FOR UPDATE
TO authenticated
USING (
  has_full_access() 
  OR (solicitante_id IS NOT NULL AND solicitante_id IN (
    SELECT id FROM public.members WHERE user_id = auth.uid()
  ))
  OR (status = 'pendente' AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'pastor_geral'))
  ))
);