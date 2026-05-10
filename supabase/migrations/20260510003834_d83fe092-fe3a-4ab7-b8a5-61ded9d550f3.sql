
CREATE TABLE IF NOT EXISTS public.apresentacao_criancas_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.agenda_igreja(id) ON DELETE CASCADE,
  pai_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  pai_request_id UUID REFERENCES public.member_requests(id) ON DELETE SET NULL,
  pai_nome TEXT,
  mae_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  mae_request_id UUID REFERENCES public.member_requests(id) ON DELETE SET NULL,
  mae_nome TEXT,
  crianca_nome TEXT NOT NULL,
  crianca_cpf TEXT,
  crianca_data_nascimento DATE,
  crianca_genero TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.apresentacao_criancas_inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inscrição pública de apresentação de crianças"
  ON public.apresentacao_criancas_inscricoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Gestores Kids podem visualizar inscrições de apresentação"
  ON public.apresentacao_criancas_inscricoes FOR SELECT
  USING (public.can_access_kids_data());

CREATE POLICY "Gestores Kids podem atualizar inscrições de apresentação"
  ON public.apresentacao_criancas_inscricoes FOR UPDATE
  USING (public.can_access_kids_data());

CREATE POLICY "Gestores Kids podem excluir inscrições de apresentação"
  ON public.apresentacao_criancas_inscricoes FOR DELETE
  USING (public.can_access_kids_data());

CREATE TRIGGER update_apresentacao_criancas_inscricoes_updated_at
  BEFORE UPDATE ON public.apresentacao_criancas_inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_apres_inscr_evento ON public.apresentacao_criancas_inscricoes(evento_id);
