-- Add toggle to event: whether registrations generate a member request (for approval)
ALTER TABLE public.agenda_igreja
  ADD COLUMN IF NOT EXISTS gerar_cadastro_membro boolean NOT NULL DEFAULT false;

-- Security definer RPC used by the public registration page to create a member
-- request (pending approval) derived from an event registration.
CREATE OR REPLACE FUNCTION public.criar_solicitacao_membro_de_inscricao(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_id uuid;
  v_cpf text;
  v_nome text;
  v_birth date;
BEGIN
  v_nome := trim(coalesce(payload->>'full_name', ''));
  IF v_nome = '' THEN
    RETURN NULL;
  END IF;

  v_cpf := nullif(regexp_replace(coalesce(payload->>'cpf',''), '\D', '', 'g'), '');
  v_birth := nullif(payload->>'birth_date','')::date;

  -- Skip if already an approved member (by cpf or by exact name+birth)
  IF v_cpf IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.cpf = v_cpf AND (m.excluido IS NULL OR m.excluido = false)
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.members m
    WHERE lower(m.full_name) = lower(v_nome)
      AND (v_birth IS NULL OR m.birth_date = v_birth)
      AND (m.excluido IS NULL OR m.excluido = false)
  ) THEN
    RETURN NULL;
  END IF;

  -- Skip if there is already a pending request for the same person
  IF v_cpf IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.member_requests r
    WHERE r.cpf = v_cpf AND r.status = 'pendente'
  ) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.member_requests r
    WHERE lower(r.full_name) = lower(v_nome)
      AND r.status = 'pendente'
      AND (v_birth IS NULL OR r.birth_date = v_birth)
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.member_requests (
    full_name, email, whatsapp, genero, birth_date, cpf, status
  ) VALUES (
    v_nome,
    nullif(payload->>'email',''),
    nullif(payload->>'whatsapp',''),
    nullif(payload->>'genero',''),
    v_birth,
    v_cpf,
    'pendente'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.criar_solicitacao_membro_de_inscricao(jsonb) TO anon, authenticated, service_role;