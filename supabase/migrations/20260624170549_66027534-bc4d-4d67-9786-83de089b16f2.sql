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
    full_name, email, whatsapp, genero, birth_date, cpf, estado_civil,
    cep, address, number, complement, neighborhood, city, state, status
  ) VALUES (
    v_nome,
    nullif(payload->>'email',''),
    nullif(payload->>'whatsapp',''),
    nullif(payload->>'genero',''),
    v_birth,
    v_cpf,
    nullif(payload->>'estado_civil',''),
    nullif(payload->>'cep',''),
    nullif(payload->>'address',''),
    nullif(payload->>'number',''),
    nullif(payload->>'complement',''),
    nullif(payload->>'neighborhood',''),
    nullif(payload->>'city',''),
    nullif(payload->>'state',''),
    'pendente'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;