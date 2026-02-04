
-- Recriar a view members_safe COM security_definer para permitir acesso público
-- Primeiro dropar a view existente
DROP VIEW IF EXISTS public.members_safe;

-- Criar a view com security_invoker=false (comportamento definer)
-- Isso permite que usuários não autenticados acessem os dados básicos para seleção de responsável
CREATE VIEW public.members_safe
WITH (security_invoker=false) AS
SELECT 
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
WHERE (excluido = false OR excluido IS NULL);

-- Conceder acesso à view para usuários anônimos
GRANT SELECT ON public.members_safe TO anon;
GRANT SELECT ON public.members_safe TO authenticated;

COMMENT ON VIEW public.members_safe IS 'View pública para seleção de responsáveis - permite acesso anônimo para cadastro de menores';
