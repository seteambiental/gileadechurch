
-- Add kids_turma_override to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS kids_turma_override text NULL;

-- Add kids_turma_override to novos_convertidos
ALTER TABLE public.novos_convertidos ADD COLUMN IF NOT EXISTS kids_turma_override text NULL;

-- Create kids transfer requests table
CREATE TABLE public.kids_transferencias_turma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  crianca_novo_convertido_id uuid REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  turma_origem text NOT NULL,
  turma_destino text NOT NULL,
  motivo text,
  status text NOT NULL DEFAULT 'pendente',
  solicitante_id uuid REFERENCES public.members(id) NOT NULL,
  aprovador_id uuid REFERENCES public.members(id),
  data_aprovacao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kids_transferencias_turma ENABLE ROW LEVEL SECURITY;

-- RLS: kids leaders can view all transfer requests
CREATE POLICY "Kids leaders can view transfers"
ON public.kids_transferencias_turma
FOR SELECT
TO authenticated
USING (can_access_kids_data());

-- RLS: kids leaders can insert transfer requests
CREATE POLICY "Kids leaders can insert transfers"
ON public.kids_transferencias_turma
FOR INSERT
TO authenticated
WITH CHECK (can_access_kids_data());

-- RLS: kids leaders can update transfer requests
CREATE POLICY "Kids leaders can update transfers"
ON public.kids_transferencias_turma
FOR UPDATE
TO authenticated
USING (can_access_kids_data());

-- RLS: kids leaders can delete transfer requests
CREATE POLICY "Kids leaders can delete transfers"
ON public.kids_transferencias_turma
FOR DELETE
TO authenticated
USING (can_access_kids_data());

-- Trigger for updated_at
CREATE TRIGGER update_kids_transferencias_turma_updated_at
  BEFORE UPDATE ON public.kids_transferencias_turma
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
