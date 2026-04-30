-- 1. Temporariamente desativar trigger sync para não interferir nas deleções manuais
ALTER TABLE public.inscricoes_eventos DISABLE TRIGGER trg_sync_inscricao_evento_to_impacto;

-- 2. Deletar duplicatas conhecidas em impacto_inscricoes (mantendo o registro com dados financeiros / mais completos)
DELETE FROM public.impacto_inscricoes WHERE id IN (
  '9ab4b4a3-360e-4539-b5f6-67f2daf873cf', -- Antonio Eduardo dup
  'eee17608-7cec-4fb0-84dd-82f57160810c', -- Débora Cristina dup
  'e9beb752-6dfc-487e-87a5-835bb3256f17', -- Elaine Cristina dup
  '45b0f812-88df-47b2-a1c5-0914a49c4d7c', -- Gisleine dup
  '8bdce1f4-5303-493a-827b-91d92ddbc4f0', -- Jessica dup
  '724ece3d-dc5a-4b32-b93d-0951d240a125', -- Kauan dup
  'ec3778d5-6321-490c-a007-8340b2a81702', -- Maria Cristina dup
  '3f47d81d-2c55-498d-a3e9-1244f669003b', -- Maria Helena dup
  '531da765-9a41-4055-bc10-7a1cca07e8e5', -- Odilon dup
  '1ffe28da-a81d-4310-925e-21ed66f1a193'  -- Zelair dup
);

-- 3. Normalizar nomes (trim) em impacto_inscricoes para evitar futuras divergências
UPDATE public.impacto_inscricoes SET nome = trim(nome) WHERE nome <> trim(nome);
UPDATE public.inscricoes_eventos SET nome_participante = trim(nome_participante) WHERE nome_participante <> trim(nome_participante);

-- 4. Criar índice único parcial em impacto_inscricoes por (evento_id, member_id) quando member_id existe
CREATE UNIQUE INDEX IF NOT EXISTS impacto_inscricoes_evento_member_uniq 
  ON public.impacto_inscricoes (evento_id, member_id) 
  WHERE member_id IS NOT NULL;

-- 5. Criar índice único parcial por (evento_id, lower(trim(nome))) quando member_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS impacto_inscricoes_evento_nome_uniq 
  ON public.impacto_inscricoes (evento_id, lower(trim(nome))) 
  WHERE member_id IS NULL;

-- 6. Atualizar o trigger sync para usar trim e tratar conflitos de forma idempotente
CREATE OR REPLACE FUNCTION public.sync_inscricao_evento_to_impacto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT id INTO v_existing_id
  FROM public.impacto_inscricoes
  WHERE evento_id = NEW.evento_id
    AND (
      (NEW.member_id IS NOT NULL AND member_id = NEW.member_id)
      OR (NEW.member_id IS NULL AND lower(trim(nome)) = v_nome_norm)
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
      -- Outra transação já criou o registro mirror; ignorar
      NULL;
    END;
  ELSE
    UPDATE public.impacto_inscricoes SET
      member_id = COALESCE(NEW.member_id, member_id),
      nome = trim(NEW.nome_participante),
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
$$;

-- 7. Reativar trigger
ALTER TABLE public.inscricoes_eventos ENABLE TRIGGER trg_sync_inscricao_evento_to_impacto;