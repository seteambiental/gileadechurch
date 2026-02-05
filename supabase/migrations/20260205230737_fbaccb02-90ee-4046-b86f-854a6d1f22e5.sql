-- Fix Security Definer Views - change to Security Invoker
-- This ensures views respect RLS policies of the querying user, not the view creator

-- Drop and recreate members_safe with security_invoker = true
DROP VIEW IF EXISTS public.members_safe;

CREATE OR REPLACE VIEW public.members_safe 
WITH (security_invoker = on)
AS SELECT 
    id,
    full_name,
    email,
    whatsapp,
    address,
    number,
    complement,
    neighborhood,
    city,
    state,
    cep,
    photo_url,
    genero,
    estado_civil,
    cpf,
    rg,
    birth_date,
    member_since,
    casa_refugio_id,
    user_id,
    kids_numero,
    created_at,
    updated_at
FROM members
WHERE excluido = false OR excluido IS NULL;

-- Drop and recreate inscricao_pessoas_busca with security_invoker = true
DROP VIEW IF EXISTS public.inscricao_pessoas_busca;

CREATE OR REPLACE VIEW public.inscricao_pessoas_busca
WITH (security_invoker = on)
AS SELECT 
    members.id,
    members.full_name,
    members.whatsapp,
    members.genero,
    members.cpf,
    members.casa_refugio_id,
    'member'::text AS tipo_pessoa
FROM members
UNION ALL
SELECT 
    novos_convertidos.id,
    novos_convertidos.full_name,
    novos_convertidos.whatsapp,
    novos_convertidos.genero,
    novos_convertidos.cpf,
    novos_convertidos.casa_refugio_id,
    'convertido'::text AS tipo_pessoa
FROM novos_convertidos;

-- Grant appropriate permissions on the views
GRANT SELECT ON public.members_safe TO authenticated;
GRANT SELECT ON public.inscricao_pessoas_busca TO authenticated;