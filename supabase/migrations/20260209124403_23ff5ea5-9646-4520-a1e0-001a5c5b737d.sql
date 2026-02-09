-- Recriar a view members_safe SEM security_invoker para permitir acesso público (cadastro sem autenticação)
DROP VIEW IF EXISTS public.members_safe;

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