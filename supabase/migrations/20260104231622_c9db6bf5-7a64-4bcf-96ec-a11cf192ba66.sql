-- Recriar a view com SECURITY INVOKER (padrão seguro)
DROP VIEW IF EXISTS public.members_safe;

CREATE VIEW public.members_safe 
WITH (security_invoker = true) AS
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