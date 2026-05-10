CREATE OR REPLACE FUNCTION public.buscar_responsaveis_publico(termo TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  origem TEXT,
  status TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.full_name, 'member'::text AS origem, 'aprovado'::text AS status
  FROM public.members m
  WHERE (m.excluido IS NULL OR m.excluido = false)
    AND (
      termo IS NULL OR length(trim(termo)) < 2
      OR lower(m.full_name) LIKE '%' || lower(trim(termo)) || '%'
    )
  UNION ALL
  SELECT r.id, r.full_name, 'request'::text AS origem, r.status
  FROM public.member_requests r
  WHERE r.status IN ('pendente', 'aprovado')
    AND r.member_id IS NULL
    AND (
      termo IS NULL OR length(trim(termo)) < 2
      OR lower(r.full_name) LIKE '%' || lower(trim(termo)) || '%'
    )
  ORDER BY full_name
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_responsaveis_publico(TEXT) TO anon, authenticated;