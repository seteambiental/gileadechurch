-- Criar tabela para solicitações de cadastro de membros (aguardando aprovação)
CREATE TABLE public.member_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  genero TEXT,
  birth_date DATE,
  cep TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  cpf TEXT,
  rg TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, rejeitado
  motivo_rejeicao TEXT,
  aprovado_por UUID REFERENCES auth.users(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  member_id UUID REFERENCES public.members(id), -- Vinculo após aprovação
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.member_requests ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode INSERIR uma solicitação (formulário público)
CREATE POLICY "Anyone can submit member request"
  ON public.member_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política: Somente admin/master podem VER as solicitações
CREATE POLICY "Admin can view member requests"
  ON public.member_requests
  FOR SELECT
  TO authenticated
  USING (is_admin() OR is_master());

-- Política: Somente admin/master podem ATUALIZAR (aprovar/rejeitar)
CREATE POLICY "Admin can update member requests"
  ON public.member_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_master())
  WITH CHECK (is_admin() OR is_master());

-- Política: Somente admin/master podem DELETAR
CREATE POLICY "Admin can delete member requests"
  ON public.member_requests
  FOR DELETE
  TO authenticated
  USING (is_admin() OR is_master());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_member_requests_updated_at
  BEFORE UPDATE ON public.member_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();