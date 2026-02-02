
-- Criar candidaturas para membros existentes baseado nas regras de roteamento
-- Ministério GT: 12-16 anos
-- Ministério Flow: 17+ solteiros
-- Ministério Mulheres: 17+ casadas/viúvas
-- Ministério True Man: 17+ casados/viúvos

DO $$
DECLARE
  v_gt_id uuid;
  v_flow_id uuid;
  v_mulheres_id uuid;
  v_trueman_id uuid;
BEGIN
  -- Buscar IDs dos ministérios
  SELECT id INTO v_gt_id FROM ministries WHERE name = 'Ministério GT' LIMIT 1;
  SELECT id INTO v_flow_id FROM ministries WHERE name = 'Ministério Flow' LIMIT 1;
  SELECT id INTO v_mulheres_id FROM ministries WHERE name = 'Ministério Mulheres' LIMIT 1;
  SELECT id INTO v_trueman_id FROM ministries WHERE name = 'Ministério True Man' LIMIT 1;

  -- GT: membros de 12-16 anos
  IF v_gt_id IS NOT NULL THEN
    INSERT INTO candidaturas_ministerio (member_id, ministry_id, mensagem, status)
    SELECT m.id, v_gt_id, 'Direcionamento automático por faixa etária', 'pendente'
    FROM members m
    WHERE m.birth_date IS NOT NULL
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, m.birth_date)) >= 12
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, m.birth_date)) < 17
      AND NOT EXISTS (
        SELECT 1 FROM candidaturas_ministerio cm 
        WHERE cm.member_id = m.id AND cm.ministry_id = v_gt_id
      );
  END IF;

  -- Flow: 17+ solteiros (homens e mulheres)
  IF v_flow_id IS NOT NULL THEN
    INSERT INTO candidaturas_ministerio (member_id, ministry_id, mensagem, status)
    SELECT m.id, v_flow_id, 'Direcionamento automático por estado civil', 'pendente'
    FROM members m
    WHERE m.birth_date IS NOT NULL
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, m.birth_date)) >= 17
      AND m.estado_civil = 'solteiro'
      AND NOT EXISTS (
        SELECT 1 FROM candidaturas_ministerio cm 
        WHERE cm.member_id = m.id AND cm.ministry_id = v_flow_id
      );
  END IF;

  -- Mulheres: 17+ casadas ou viúvas
  IF v_mulheres_id IS NOT NULL THEN
    INSERT INTO candidaturas_ministerio (member_id, ministry_id, mensagem, status)
    SELECT m.id, v_mulheres_id, 'Direcionamento automático por estado civil', 'pendente'
    FROM members m
    WHERE m.birth_date IS NOT NULL
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, m.birth_date)) >= 17
      AND m.estado_civil IN ('casado', 'viuvo')
      AND m.genero = 'feminino'
      AND NOT EXISTS (
        SELECT 1 FROM candidaturas_ministerio cm 
        WHERE cm.member_id = m.id AND cm.ministry_id = v_mulheres_id
      );
  END IF;

  -- True Man: 17+ casados ou viúvos
  IF v_trueman_id IS NOT NULL THEN
    INSERT INTO candidaturas_ministerio (member_id, ministry_id, mensagem, status)
    SELECT m.id, v_trueman_id, 'Direcionamento automático por estado civil', 'pendente'
    FROM members m
    WHERE m.birth_date IS NOT NULL
      AND EXTRACT(YEAR FROM age(CURRENT_DATE, m.birth_date)) >= 17
      AND m.estado_civil IN ('casado', 'viuvo')
      AND m.genero = 'masculino'
      AND NOT EXISTS (
        SELECT 1 FROM candidaturas_ministerio cm 
        WHERE cm.member_id = m.id AND cm.ministry_id = v_trueman_id
      );
  END IF;
END $$;
