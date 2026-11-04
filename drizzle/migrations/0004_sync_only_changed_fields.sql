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

  IF NOT EXISTS (SELECT 1 FROM public.impacto_eventos WHERE id = NEW.evento_id) THEN
    BEGIN
      INSERT INTO public.impacto_eventos (id, titulo, data_inicio, data_fim, tipo, local, limite_vagas)
      SELECT a.id, COALESCE(a.titulo, 'Evento'), COALESCE(a.data_evento, CURRENT_DATE), a.data_fim,
             COALESCE(a.tipo_evento, 'evento'), a.local, a.limite_vagas
      FROM public.agenda_igreja a WHERE a.id = NEW.evento_id
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      INSERT INTO public.impacto_eventos (id, titulo, data_inicio, data_fim, tipo, local, limite_vagas)
      SELECT a.id, COALESCE(a.titulo, 'Evento') || ' (' || left(a.id::text, 8) || ')',
             COALESCE(a.data_evento, CURRENT_DATE), a.data_fim,
             COALESCE(a.tipo_evento, 'evento'), a.local, a.limite_vagas
      FROM public.agenda_igreja a WHERE a.id = NEW.evento_id
      ON CONFLICT (id) DO NOTHING;
    END;
  END IF;

  v_nome_norm := lower(trim(NEW.nome_participante));

  IF NEW.member_id IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM public.impacto_inscricoes
    WHERE evento_id = NEW.evento_id AND member_id = NEW.member_id LIMIT 1;
  END IF;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM public.impacto_inscricoes
    WHERE evento_id = NEW.evento_id
      AND lower(trim(nome)) = v_nome_norm
      AND (NEW.member_id IS NULL OR member_id IS NULL OR member_id = NEW.member_id)
    LIMIT 1;
  END IF;

  IF NEW.member_id IS NOT NULL THEN
    SELECT m.birth_date, m.email INTO v_data_nasc, v_email FROM public.members m WHERE m.id = NEW.member_id;
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
        converteu, reconciliou, created_at, updated_at
      ) VALUES (
        NEW.evento_id, NEW.member_id, trim(NEW.nome_participante), NEW.telefone_contato, v_email,
        NEW.genero, v_data_nasc, NEW.observacoes,
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
    -- Só propaga campos que realmente mudaram, para não sobrescrever edições feitas na aba de inscrições.
    UPDATE public.impacto_inscricoes SET
      member_id = COALESCE(NEW.member_id, member_id),
      nome = CASE WHEN TG_OP = 'UPDATE' AND NEW.nome_participante IS NOT DISTINCT FROM OLD.nome_participante THEN nome ELSE trim(NEW.nome_participante) END,
      telefone = CASE WHEN TG_OP = 'UPDATE' AND NEW.telefone_contato IS NOT DISTINCT FROM OLD.telefone_contato THEN telefone ELSE COALESCE(NEW.telefone_contato, telefone) END,
      genero = CASE WHEN TG_OP = 'UPDATE' AND NEW.genero IS NOT DISTINCT FROM OLD.genero THEN genero ELSE COALESCE(NEW.genero, genero) END,
      observacoes = CASE WHEN TG_OP = 'UPDATE' AND NEW.observacoes IS NOT DISTINCT FROM OLD.observacoes THEN observacoes ELSE COALESCE(NEW.observacoes, observacoes) END,
      forma_pagamento = CASE WHEN TG_OP = 'UPDATE' AND NEW.forma_pagamento IS NOT DISTINCT FROM OLD.forma_pagamento THEN forma_pagamento ELSE COALESCE(NEW.forma_pagamento, forma_pagamento) END,
      tipo_inscricao = CASE WHEN TG_OP = 'UPDATE' AND NEW.tipo_inscricao IS NOT DISTINCT FROM OLD.tipo_inscricao THEN tipo_inscricao ELSE COALESCE(NEW.tipo_inscricao, tipo_inscricao) END,
      valor_inscricao = CASE WHEN TG_OP = 'UPDATE' AND NEW.valor_inscricao IS NOT DISTINCT FROM OLD.valor_inscricao THEN valor_inscricao ELSE COALESCE(NEW.valor_inscricao, valor_inscricao) END,
      aprovado = CASE WHEN TG_OP = 'UPDATE' AND NEW.aprovado IS NOT DISTINCT FROM OLD.aprovado THEN aprovado ELSE COALESCE(NEW.aprovado, aprovado) END,
      telefone_emergencia = CASE WHEN TG_OP = 'UPDATE' AND NEW.telefone_emergencia IS NOT DISTINCT FROM OLD.telefone_emergencia THEN telefone_emergencia ELSE COALESCE(NEW.telefone_emergencia, telefone_emergencia) END,
      nome_responsavel = CASE WHEN TG_OP = 'UPDATE' AND NEW.nome_responsavel IS NOT DISTINCT FROM OLD.nome_responsavel THEN nome_responsavel ELSE COALESCE(NEW.nome_responsavel, nome_responsavel) END,
      telefone_responsavel = CASE WHEN TG_OP = 'UPDATE' AND NEW.telefone_responsavel IS NOT DISTINCT FROM OLD.telefone_responsavel THEN telefone_responsavel ELSE COALESCE(NEW.telefone_responsavel, telefone_responsavel) END,
      converteu = CASE WHEN TG_OP = 'UPDATE' AND NEW.converteu IS NOT DISTINCT FROM OLD.converteu THEN converteu ELSE COALESCE(NEW.converteu, converteu) END,
      reconciliou = CASE WHEN TG_OP = 'UPDATE' AND NEW.reconciliou IS NOT DISTINCT FROM OLD.reconciliou THEN reconciliou ELSE COALESCE(NEW.reconciliou, reconciliou) END,
      status_pagamento = CASE WHEN TG_OP = 'UPDATE' AND NEW.status_pagamento IS NOT DISTINCT FROM OLD.status_pagamento THEN status_pagamento ELSE NEW.status_pagamento END,
      data_nascimento = CASE WHEN TG_OP = 'UPDATE' AND NEW.data_nascimento IS NOT DISTINCT FROM OLD.data_nascimento AND NEW.member_id IS NOT DISTINCT FROM OLD.member_id THEN data_nascimento ELSE COALESCE(v_data_nasc, data_nascimento) END,
      updated_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$function$;