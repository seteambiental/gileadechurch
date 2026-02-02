-- Ensure public (unauthenticated) registration can list existing members safely
-- Fix: make members_safe run with definer privileges so it can bypass RLS on members

CREATE OR REPLACE VIEW public.members_safe
WITH (security_invoker = false)
AS
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
  CASE WHEN is_admin() OR is_master() THEN cpf ELSE NULL::text END AS cpf,
  CASE WHEN is_admin() OR is_master() THEN rg  ELSE NULL::text END AS rg
FROM public.members;

GRANT SELECT ON public.members_safe TO anon;
GRANT SELECT ON public.members_safe TO authenticated;
