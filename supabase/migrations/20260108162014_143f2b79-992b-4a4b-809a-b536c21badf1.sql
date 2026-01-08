-- Passo 1: Remover policies que dependem do enum app_role
DROP POLICY IF EXISTS "Admins and masters can manage user_ministries" ON public.user_ministries;
DROP POLICY IF EXISTS "Admins and masters can manage igreja_config" ON public.igreja_config;
DROP POLICY IF EXISTS "Admins podem gerenciar todas candidaturas" ON public.candidaturas_ministerio;
DROP POLICY IF EXISTS "Admins podem gerenciar PIX" ON public.igreja_pix;

-- Passo 2: Remover a função has_role que depende do enum
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Passo 3: Alterar a coluna requested_role para TEXT temporariamente
ALTER TABLE public.user_access_requests 
  ALTER COLUMN requested_role TYPE TEXT;

-- Passo 4: Alterar a coluna role na tabela user_roles para TEXT temporariamente
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE TEXT;

-- Passo 5: Remover o enum antigo
DROP TYPE IF EXISTS public.app_role;

-- Passo 6: Criar o novo enum com os novos roles
CREATE TYPE public.app_role AS ENUM (
  'admin',           -- Administrador (Acesso Completo + Desenvolvimento)
  'pastor_geral',    -- Pastor Geral (Acesso Completo)
  'pastor_auxiliar', -- Pastor Auxiliar (Acesso Completo)
  'lider_condominio', -- Líder de Condomínio
  'supervisor_casa_refugio', -- Supervisor de Casa Refúgio
  'lider_casa_refugio', -- Líder de Casa Refúgio
  'lider_ministerio', -- Líder de Ministério (CRUD completo no ministério)
  'integrante_ministerio', -- Integrante de Ministério (visualização)
  'membro'           -- Membro (apenas portal do membro)
);

-- Passo 7: Converter os dados existentes na tabela user_roles
UPDATE public.user_roles SET role = 
  CASE role
    WHEN 'admin' THEN 'admin'
    WHEN 'master' THEN 'pastor_geral'
    WHEN 'ministerial' THEN 'lider_ministerio'
    WHEN 'member' THEN 'membro'
    ELSE 'membro'
  END;

-- Passo 8: Alterar a coluna role na tabela user_roles para usar o novo enum
ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- Passo 9: Converter dados na user_access_requests
UPDATE public.user_access_requests SET requested_role = 
  CASE requested_role
    WHEN 'admin' THEN 'admin'
    WHEN 'master' THEN 'pastor_geral'
    WHEN 'ministerial' THEN 'lider_ministerio'
    WHEN 'member' THEN 'membro'
    ELSE 'membro'
  END;

-- Passo 10: Alterar a coluna requested_role para usar o novo enum
ALTER TABLE public.user_access_requests 
  ALTER COLUMN requested_role TYPE public.app_role USING requested_role::public.app_role;

-- Passo 11: Recriar a função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Passo 12: Função para verificar se tem acesso completo
CREATE OR REPLACE FUNCTION public.has_full_access()
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
      AND role IN ('admin', 'pastor_geral', 'pastor_auxiliar')
  )
$$;

-- Passo 13: Atualizar is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
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
      AND role = 'admin'
  )
$$;

-- Passo 14: Atualizar is_master para incluir pastores
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
      AND role IN ('admin', 'pastor_geral', 'pastor_auxiliar')
  )
$$;

-- Passo 15: Recriar as policies removidas
CREATE POLICY "Admins and masters can manage user_ministries"
ON public.user_ministries
FOR ALL
TO authenticated
USING (public.has_full_access());

CREATE POLICY "Admins and masters can manage igreja_config"
ON public.igreja_config
FOR ALL
TO authenticated
USING (public.has_full_access());

CREATE POLICY "Admins podem gerenciar todas candidaturas"
ON public.candidaturas_ministerio
FOR ALL
TO authenticated
USING (public.has_full_access());

CREATE POLICY "Admins podem gerenciar PIX"
ON public.igreja_pix
FOR ALL
TO authenticated
USING (public.has_full_access());

-- Passo 16: Criar funções auxiliares para os novos roles
CREATE OR REPLACE FUNCTION public.is_lider_condominio()
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
      AND role = 'lider_condominio'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor_casa_refugio()
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
      AND role = 'supervisor_casa_refugio'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_lider_casa_refugio()
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
      AND role = 'lider_casa_refugio'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_lider_ministerio()
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
      AND role = 'lider_ministerio'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_integrante_ministerio()
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
      AND role = 'integrante_ministerio'
  )
$$;