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
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.impacto_inscricoes
    WHERE evento_id = OLD.evento_id
      AND (
        (OLD.member_id IS NOT NULL AND member_id = OLD.member_id)
        OR (OLD.member_id IS NULL AND lower(nome) = lower(OLD.nome_participante))
      );
    RETURN OLD;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.impacto_inscricoes
  WHERE evento_id = NEW.evento_id
    AND (
      (NEW.member_id IS NOT NULL AND member_id = NEW.member_id)
      OR (NEW.member_id IS NULL AND lower(nome) = lower(NEW.nome_participante))
    )
  LIMIT 1;

  IF NEW.member_id IS NOT NULL THEN
    SELECT m.birth_date, m.email INTO v_data_nasc, v_email
    FROM public.members m
    WHERE m.id = NEW.member_id;
  END IF;

  IF NEW.status_pagamento = 'cancelado' THEN
    IF v_existing_id IS NOT NULL THEN
      DELETE FROM public.impacto_inscricoes WHERE id = v_existing_id;
    END IF;
    RETURN NEW;
  END IF;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.impacto_inscricoes (
      evento_id, member_id, nome, telefone, email, genero, data_nascimento,
      observacoes, valor_pago, status_pagamento, forma_pagamento,
      tipo_inscricao, valor_inscricao, aprovado,
      telefone_emergencia, nome_responsavel, telefone_responsavel,
      created_at, updated_at
    ) VALUES (
      NEW.evento_id, NEW.member_id, NEW.nome_participante, NEW.telefone_contato, v_email,
      NEW.genero, v_data_nasc,
      NEW.observacoes,
      CASE WHEN NEW.status_pagamento = 'pago' THEN COALESCE(NEW.valor_inscricao, 0) ELSE 0 END,
      NEW.status_pagamento, NEW.forma_pagamento,
      COALESCE(NEW.tipo_inscricao, 'membro'), COALESCE(NEW.valor_inscricao, 0),
      COALESCE(NEW.aprovado, true),
      NEW.telefone_emergencia, NEW.nome_responsavel, NEW.telefone_responsavel,
      NEW.created_at, NEW.updated_at
    );
  ELSE
    UPDATE public.impacto_inscricoes SET
      member_id = COALESCE(NEW.member_id, member_id),
      nome = NEW.nome_participante,
      telefone = COALESCE(NEW.telefone_contato, telefone),
      genero = COALESCE(NEW.genero, genero),
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