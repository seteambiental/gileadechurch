
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
  v_to_delete UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    SELECT id INTO v_to_delete
    FROM public.impacto_inscricoes
    WHERE evento_id = OLD.evento_id
      AND (
        (OLD.member_id IS NOT NULL AND member_id = OLD.member_id)
        OR (OLD.member_id IS NULL AND lower(trim(nome)) = lower(trim(OLD.nome_participante)))
      )
    ORDER BY created_at
    LIMIT 1;

    IF v_to_delete IS NOT NULL THEN
      DELETE FROM public.impacto_inscricoes WHERE id = v_to_delete;
    END IF;
    RETURN OLD;
  END IF;

  -- Garante que exista um evento espelho em impacto_eventos para satisfazer a FK.
  IF NOT EXISTS (SELECT 1 FROM public.impacto_eventos WHERE id = NEW.evento_id) THEN
    INSERT INTO public.impacto_eventos (id, titulo, data_inicio, data_fim, tipo, local, limite_vagas)
    SELECT a.id,
           COALESCE(a.titulo, 'Evento'),
           COALESCE(a.data_evento, CURRENT_DATE),
           a.data_fim,
           COALESCE(a.tipo_evento, 'evento'),
           a.local,
           a.limite_vagas
    FROM public.agenda_igreja a
    WHERE a.id = NEW.evento_id
    ON CONFLICT (id) DO NOTHING;
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
        converteu, reconciliou,
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
        COALESCE(NEW.converteu, false), COALESCE(NEW.reconciliou, false),
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
      converteu = COALESCE(NEW.converteu, converteu),
      reconciliou = COALESCE(NEW.reconciliou, reconciliou),
      updated_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$function$;
