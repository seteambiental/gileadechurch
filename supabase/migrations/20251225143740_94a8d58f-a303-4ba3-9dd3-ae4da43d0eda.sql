-- Tabela para vincular usuários ministeriais aos ministérios
CREATE TABLE public.user_ministries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ministry_id)
);

ALTER TABLE public.user_ministries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and masters can manage user_ministries"
ON public.user_ministries FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));

CREATE POLICY "Users can view their own ministries"
ON public.user_ministries FOR SELECT
USING (auth.uid() = user_id);

-- Tabela para solicitações de acesso pendentes
CREATE TABLE public.user_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  email text NOT NULL,
  requested_role app_role NOT NULL,
  requested_ministry_ids uuid[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pendente',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert access requests"
ON public.user_access_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Masters can view and manage access requests"
ON public.user_access_requests FOR SELECT
USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Masters can update access requests"
ON public.user_access_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

CREATE POLICY "Masters can delete access requests"
ON public.user_access_requests FOR DELETE
USING (public.has_role(auth.uid(), 'master'));

-- Tabela de dados da igreja
CREATE TABLE public.igreja_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia text NOT NULL,
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  inscricao_estadual text,
  inscricao_municipal text,
  responsavel_legal text NOT NULL,
  cpf_responsavel text,
  cargo_responsavel text,
  email text,
  telefone text,
  celular text,
  website text,
  cep text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.igreja_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view igreja_config"
ON public.igreja_config FOR SELECT
USING (true);

CREATE POLICY "Admins and masters can manage igreja_config"
ON public.igreja_config FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'master'));

-- Trigger para updated_at
CREATE TRIGGER update_user_access_requests_updated_at
BEFORE UPDATE ON public.user_access_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_igreja_config_updated_at
BEFORE UPDATE ON public.igreja_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se é master
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'master'
  )
$$;