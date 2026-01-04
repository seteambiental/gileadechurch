-- Remover políticas existentes da tabela members
DROP POLICY IF EXISTS "Anyone can delete members" ON public.members;
DROP POLICY IF EXISTS "Anyone can view members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;

-- Criar view segura que oculta CPF e RG para usuários não-admin
CREATE OR REPLACE VIEW public.members_safe AS
SELECT 
  id,
  full_name,
  email,
  whatsapp,
  birth_date,
  address,
  number,
  complement,
  neighborhood,
  city,
  state,
  cep,
  photo_url,
  member_since,
  casa_refugio_id,
  user_id,
  genero,
  estado_civil,
  kids_numero,
  created_at,
  updated_at,
  CASE 
    WHEN is_admin() OR is_master() THEN cpf
    ELSE NULL
  END as cpf,
  CASE 
    WHEN is_admin() OR is_master() THEN rg
    ELSE NULL
  END as rg
FROM public.members;

-- Criar novas políticas restritivas para members
CREATE POLICY "Authenticated users can view members"
ON public.members
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert members"
ON public.members
FOR INSERT
WITH CHECK (is_admin() OR is_master());

CREATE POLICY "Admins can update members"
ON public.members
FOR UPDATE
USING (is_admin() OR is_master());

CREATE POLICY "Admins can delete members"
ON public.members
FOR DELETE
USING (is_admin() OR is_master());