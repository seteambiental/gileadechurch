CREATE TABLE public.apresentacao_criancas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  familia_membro boolean NOT NULL DEFAULT false,
  pai_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  pai_nome text,
  pai_nao_identificado boolean NOT NULL DEFAULT false,
  mae_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  mae_nome text,
  mae_nao_identificado boolean NOT NULL DEFAULT false,
  crianca_nome text NOT NULL,
  crianca_cpf text,
  crianca_rg text,
  crianca_data_nascimento date,
  crianca_genero text,
  crianca_photo_url text,
  cep text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  observacoes text,
  status text NOT NULL DEFAULT 'pendente',
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apresentacao_criancas TO authenticated;
GRANT INSERT ON public.apresentacao_criancas TO anon;
GRANT ALL ON public.apresentacao_criancas TO service_role;

ALTER TABLE public.apresentacao_criancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inscricao publica de apresentacao"
  ON public.apresentacao_criancas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Gestores podem visualizar apresentacoes"
  ON public.apresentacao_criancas FOR SELECT
  USING (has_full_access() OR can_access_kids_data());

CREATE POLICY "Gestores podem atualizar apresentacoes"
  ON public.apresentacao_criancas FOR UPDATE
  USING (has_full_access() OR can_access_kids_data());

CREATE POLICY "Gestores podem excluir apresentacoes"
  ON public.apresentacao_criancas FOR DELETE
  USING (has_full_access() OR can_access_kids_data());

CREATE TRIGGER update_apresentacao_criancas_updated_at
  BEFORE UPDATE ON public.apresentacao_criancas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();