-- 1. Add column
ALTER TABLE public.inscricoes_eventos ADD COLUMN IF NOT EXISTS data_nascimento date;

-- 2. Update public RPC to accept data_nascimento
CREATE OR REPLACE FUNCTION public.criar_inscricao_evento_publica(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.inscricoes_eventos (
    evento_id, member_id, novo_convertido_id, nome_participante, genero,
    telefone_contato, telefone_emergencia, is_menor, nome_responsavel, telefone_responsavel,
    preferencia_beliche, tem_alergia_alimentar, descricao_alergia, toma_medicamento, descricao_medicamento,
    forma_pagamento, lista_espera, observacoes, cpf, casa_refugio_id, tipo_inscricao, valor_inscricao,
    data_nascimento
  ) VALUES (
    NULLIF(payload->>'evento_id','')::uuid,
    NULLIF(payload->>'member_id','')::uuid,
    NULLIF(payload->>'novo_convertido_id','')::uuid,
    payload->>'nome_participante',
    payload->>'genero',
    payload->>'telefone_contato',
    payload->>'telefone_emergencia',
    COALESCE((payload->>'is_menor')::boolean, false),
    payload->>'nome_responsavel',
    payload->>'telefone_responsavel',
    payload->>'preferencia_beliche',
    COALESCE((payload->>'tem_alergia_alimentar')::boolean, false),
    payload->>'descricao_alergia',
    COALESCE((payload->>'toma_medicamento')::boolean, false),
    payload->>'descricao_medicamento',
    payload->>'forma_pagamento',
    COALESCE((payload->>'lista_espera')::boolean, false),
    payload->>'observacoes',
    payload->>'cpf',
    NULLIF(payload->>'casa_refugio_id','')::uuid,
    COALESCE(payload->>'tipo_inscricao','membro'),
    NULLIF(payload->>'valor_inscricao','')::numeric,
    NULLIF(payload->>'data_nascimento','')::date
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 3. Update sync trigger to carry data_nascimento for non-members
CREATE OR REPLACE FUNCTION public.sync_inscricao_evento_to_impacto()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id UUID;
  v_data_nasc DATE;
  v_email TEXT;
  v_nome_norm TEXT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.impacto_inscricoes
    WHERE evento_id = OLD.evento_id
      AND (
        (OLD.member_id IS NOT NULL AND member_id = OLD.member_id)
        OR (OLD.member_id IS NULL AND lower(trim(nome)) = lower(trim(OLD.nome_participante)))
      );
    RETURN OLD;
  END IF;

  v_nome_norm := lower(trim(NEW.nome_participante));

  IF NEW.member_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.impacto_inscricoes
    WHERE evento_id = NEW.evento_id
      AND member_id = NEW.member_id
    LIMIT 1;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.impacto_inscricoes
    WHERE evento_id = NEW.evento_id
      AND lower(trim(nome)) = v_nome_norm
      AND (NEW.member_id IS NULL OR member_id IS NULL OR member_id = NEW.member_id)
    LIMIT 1;
  END IF;

  IF NEW.member_id IS NOT NULL THEN
    SELECT m.birth_date, m.email INTO v_data_nasc, v_email
    FROM public.members m
    WHERE m.id = NEW.member_id;
  END IF;

  -- Fallback to date provided on the registration form (visitors/non-members)
  IF v_data_nasc IS NULL THEN
    v_data_nasc := NEW.data_nascimento;
  END IF;

  IF NEW.status_pagamento = 'cancelado' THEN
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM public.impacto_inscricoes WHERE id = v_existing_id;
    END IF;
    RETURN NEW;
  END IF;

  IF v_existing_id IS NULL THEN
    BEGIN
      INSERT INTO public.impacto_inscricoes (
        evento_id, member_id, nome, telefone, email, genero, data_nascimento,
        observacoes, valor_pago, status_pagamento, forma_pagamento,
        tipo_inscricao, valor_inscricao, aprovado,
        telefone_emergencia, nome_responsavel, telefone_responsavel,
        created_at, updated_at
      ) VALUES (
        NEW.evento_id, NEW.member_id, trim(NEW.nome_participante), NEW.telefone_contato, v_email,
        NEW.genero, v_data_nasc,
        NEW.observacoes,
        CASE WHEN NEW.status_pagamento = 'pago' THEN COALESCE(NEW.valor_inscricao, 0) ELSE 0 END,
        NEW.status_pagamento, NEW.forma_pagamento,
        COALESCE(NEW.tipo_inscricao, 'membro'), COALESCE(NEW.valor_inscricao, 0),
        COALESCE(NEW.aprovado, true),
        NEW.telefone_emergencia, NEW.nome_responsavel, NEW.telefone_responsavel,
        NEW.created_at, NEW.updated_at
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  ELSE
    UPDATE public.impacto_inscricoes SET
      member_id = COALESCE(NEW.member_id, member_id),
      nome = trim(NEW.nome_participante),
      telefone = COALESCE(NEW.telefone_contato, telefone),
      genero = COALESCE(NEW.genero, genero),
      data_nascimento = COALESCE(v_data_nasc, data_nascimento),
      observacoes = COALESCE(NEW.observacoes, observacoes),
      status_pagamento = NEW.status_pagamento,
      forma_pagamento = COALESCE(NEW.forma_pagamento, forma_pagamento),
      tipo_inscricao = COALESCE(NEW.tipo_inscricao, tipo_inscricao),
      valor_inscricao = COALESCE(NEW.valor_inscricao, valor_inscricao),
      aprovado = COALESCE(NEW.aprovado, aprovado),
      telefone_emergencia = COALESCE(NEW.telefone_emergencia, telefone_emergencia),
      nome_responsavel = COALESCE(NEW.nome_responsavel, nome_responsavel),
      telefone_responsavel = COALESCE(NEW.telefone_responsavel, telefone_responsavel),
      updated_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$function$;