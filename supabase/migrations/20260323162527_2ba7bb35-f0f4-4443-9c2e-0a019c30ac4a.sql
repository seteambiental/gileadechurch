
CREATE TABLE public.kids_transicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  crianca_novo_convertido_id UUID REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  turma_atual TEXT NOT NULL,
  turma_nova TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'promocao',
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_one_crianca CHECK (
    (crianca_member_id IS NOT NULL AND crianca_novo_convertido_id IS NULL) OR
    (crianca_member_id IS NULL AND crianca_novo_convertido_id IS NOT NULL)
  )
);

ALTER TABLE public.kids_transicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transitions" ON public.kids_transicoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Kids leaders can insert transitions" ON public.kids_transicoes
  FOR INSERT TO authenticated WITH CHECK (can_access_kids_data());

CREATE POLICY "Kids leaders can update transitions" ON public.kids_transicoes
  FOR UPDATE TO authenticated USING (can_access_kids_data());

CREATE POLICY "Admins can delete transitions" ON public.kids_transicoes
  FOR DELETE TO authenticated USING (has_full_access());

CREATE TRIGGER update_kids_transicoes_updated_at
  BEFORE UPDATE ON public.kids_transicoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
