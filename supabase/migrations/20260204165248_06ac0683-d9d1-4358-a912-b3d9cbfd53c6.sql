
-- =====================================================
-- SINCRONIZAÇÃO DE FUNÇÕES DE LIDERANÇA
-- Atualiza member_functions com base nos líderes definidos em ministries e casas_refugio
-- =====================================================

-- 1. MINISTÉRIOS: Inserir funções de líder para líderes de ministérios
-- Inserir lider_ministerio para lider_id dos ministérios
INSERT INTO member_functions (member_id, function_type, ministry_id)
SELECT m.lider_id, 'lider_ministerio', m.id
FROM ministries m
WHERE m.lider_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = m.lider_id 
      AND mf.function_type = 'lider_ministerio' 
      AND mf.ministry_id = m.id
  );

-- Inserir lider_ministerio para lider_esposa_id dos ministérios
INSERT INTO member_functions (member_id, function_type, ministry_id)
SELECT m.lider_esposa_id, 'lider_ministerio', m.id
FROM ministries m
WHERE m.lider_esposa_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = m.lider_esposa_id 
      AND mf.function_type = 'lider_ministerio' 
      AND mf.ministry_id = m.id
  );

-- 2. CASAS REFÚGIO: Inserir funções de liderança

-- Inserir lider_casa_refugio para lider_id das casas refúgio
INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
SELECT cr.lider_id, 'lider_casa_refugio', cr.id
FROM casas_refugio cr
WHERE cr.lider_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = cr.lider_id 
      AND mf.function_type = 'lider_casa_refugio' 
      AND mf.casa_refugio_id = cr.id
  );

-- Inserir lider_casa_refugio para lider_esposa_id das casas refúgio
INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
SELECT cr.lider_esposa_id, 'lider_casa_refugio', cr.id
FROM casas_refugio cr
WHERE cr.lider_esposa_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = cr.lider_esposa_id 
      AND mf.function_type = 'lider_casa_refugio' 
      AND mf.casa_refugio_id = cr.id
  );

-- Inserir supervisor_casa_refugio para supervisor_id das casas refúgio
INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
SELECT cr.supervisor_id, 'supervisor_casa_refugio', cr.id
FROM casas_refugio cr
WHERE cr.supervisor_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = cr.supervisor_id 
      AND mf.function_type = 'supervisor_casa_refugio' 
      AND mf.casa_refugio_id = cr.id
  );

-- Inserir supervisor_casa_refugio para supervisor_esposa_id das casas refúgio
INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
SELECT cr.supervisor_esposa_id, 'supervisor_casa_refugio', cr.id
FROM casas_refugio cr
WHERE cr.supervisor_esposa_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = cr.supervisor_esposa_id 
      AND mf.function_type = 'supervisor_casa_refugio' 
      AND mf.casa_refugio_id = cr.id
  );

-- 3. CONDOMÍNIOS: Inserir funções de síndico

-- Inserir sindico_condominio para sindico_id dos condomínios
INSERT INTO member_functions (member_id, function_type, condominio_id)
SELECT c.sindico_id, 'sindico_condominio', c.id
FROM condominios c
WHERE c.sindico_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = c.sindico_id 
      AND mf.function_type = 'sindico_condominio' 
      AND mf.condominio_id = c.id
  );

-- Inserir sindico_condominio para sindico_esposa_id dos condomínios
INSERT INTO member_functions (member_id, function_type, condominio_id)
SELECT c.sindico_esposa_id, 'sindico_condominio', c.id
FROM condominios c
WHERE c.sindico_esposa_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM member_functions mf 
    WHERE mf.member_id = c.sindico_esposa_id 
      AND mf.function_type = 'sindico_condominio' 
      AND mf.condominio_id = c.id
  );

-- =====================================================
-- CRIAR TRIGGERS PARA SINCRONIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para sincronizar funções de ministério
CREATE OR REPLACE FUNCTION sync_ministry_leader_functions()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando lider_id mudar
  IF (TG_OP = 'INSERT' OR OLD.lider_id IS DISTINCT FROM NEW.lider_id) THEN
    -- Remover função do líder antigo
    IF OLD.lider_id IS NOT NULL AND OLD.lider_id IS DISTINCT FROM NEW.lider_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.lider_id 
        AND function_type = 'lider_ministerio' 
        AND ministry_id = NEW.id;
    END IF;
    
    -- Adicionar função ao novo líder
    IF NEW.lider_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, ministry_id)
      VALUES (NEW.lider_id, 'lider_ministerio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Quando lider_esposa_id mudar
  IF (TG_OP = 'INSERT' OR OLD.lider_esposa_id IS DISTINCT FROM NEW.lider_esposa_id) THEN
    -- Remover função do líder antigo
    IF OLD.lider_esposa_id IS NOT NULL AND OLD.lider_esposa_id IS DISTINCT FROM NEW.lider_esposa_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.lider_esposa_id 
        AND function_type = 'lider_ministerio' 
        AND ministry_id = NEW.id;
    END IF;
    
    -- Adicionar função ao novo líder
    IF NEW.lider_esposa_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, ministry_id)
      VALUES (NEW.lider_esposa_id, 'lider_ministerio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para sincronizar funções de casa refúgio
CREATE OR REPLACE FUNCTION sync_casa_refugio_leader_functions()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar lider_id
  IF (TG_OP = 'INSERT' OR OLD.lider_id IS DISTINCT FROM NEW.lider_id) THEN
    IF OLD.lider_id IS NOT NULL AND OLD.lider_id IS DISTINCT FROM NEW.lider_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.lider_id 
        AND function_type = 'lider_casa_refugio' 
        AND casa_refugio_id = NEW.id;
    END IF;
    
    IF NEW.lider_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
      VALUES (NEW.lider_id, 'lider_casa_refugio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Sincronizar lider_esposa_id
  IF (TG_OP = 'INSERT' OR OLD.lider_esposa_id IS DISTINCT FROM NEW.lider_esposa_id) THEN
    IF OLD.lider_esposa_id IS NOT NULL AND OLD.lider_esposa_id IS DISTINCT FROM NEW.lider_esposa_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.lider_esposa_id 
        AND function_type = 'lider_casa_refugio' 
        AND casa_refugio_id = NEW.id;
    END IF;
    
    IF NEW.lider_esposa_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
      VALUES (NEW.lider_esposa_id, 'lider_casa_refugio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Sincronizar supervisor_id
  IF (TG_OP = 'INSERT' OR OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id) THEN
    IF OLD.supervisor_id IS NOT NULL AND OLD.supervisor_id IS DISTINCT FROM NEW.supervisor_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.supervisor_id 
        AND function_type = 'supervisor_casa_refugio' 
        AND casa_refugio_id = NEW.id;
    END IF;
    
    IF NEW.supervisor_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
      VALUES (NEW.supervisor_id, 'supervisor_casa_refugio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Sincronizar supervisor_esposa_id
  IF (TG_OP = 'INSERT' OR OLD.supervisor_esposa_id IS DISTINCT FROM NEW.supervisor_esposa_id) THEN
    IF OLD.supervisor_esposa_id IS NOT NULL AND OLD.supervisor_esposa_id IS DISTINCT FROM NEW.supervisor_esposa_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.supervisor_esposa_id 
        AND function_type = 'supervisor_casa_refugio' 
        AND casa_refugio_id = NEW.id;
    END IF;
    
    IF NEW.supervisor_esposa_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, casa_refugio_id)
      VALUES (NEW.supervisor_esposa_id, 'supervisor_casa_refugio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para sincronizar funções de condomínio
CREATE OR REPLACE FUNCTION sync_condominio_sindico_functions()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincronizar sindico_id
  IF (TG_OP = 'INSERT' OR OLD.sindico_id IS DISTINCT FROM NEW.sindico_id) THEN
    IF OLD.sindico_id IS NOT NULL AND OLD.sindico_id IS DISTINCT FROM NEW.sindico_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.sindico_id 
        AND function_type = 'sindico_condominio' 
        AND condominio_id = NEW.id;
    END IF;
    
    IF NEW.sindico_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, condominio_id)
      VALUES (NEW.sindico_id, 'sindico_condominio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Sincronizar sindico_esposa_id
  IF (TG_OP = 'INSERT' OR OLD.sindico_esposa_id IS DISTINCT FROM NEW.sindico_esposa_id) THEN
    IF OLD.sindico_esposa_id IS NOT NULL AND OLD.sindico_esposa_id IS DISTINCT FROM NEW.sindico_esposa_id THEN
      DELETE FROM member_functions 
      WHERE member_id = OLD.sindico_esposa_id 
        AND function_type = 'sindico_condominio' 
        AND condominio_id = NEW.id;
    END IF;
    
    IF NEW.sindico_esposa_id IS NOT NULL THEN
      INSERT INTO member_functions (member_id, function_type, condominio_id)
      VALUES (NEW.sindico_esposa_id, 'sindico_condominio', NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar triggers
DROP TRIGGER IF EXISTS sync_ministry_leaders ON ministries;
CREATE TRIGGER sync_ministry_leaders
  AFTER INSERT OR UPDATE OF lider_id, lider_esposa_id ON ministries
  FOR EACH ROW
  EXECUTE FUNCTION sync_ministry_leader_functions();

DROP TRIGGER IF EXISTS sync_casa_refugio_leaders ON casas_refugio;
CREATE TRIGGER sync_casa_refugio_leaders
  AFTER INSERT OR UPDATE OF lider_id, lider_esposa_id, supervisor_id, supervisor_esposa_id ON casas_refugio
  FOR EACH ROW
  EXECUTE FUNCTION sync_casa_refugio_leader_functions();

DROP TRIGGER IF EXISTS sync_condominio_sindicos ON condominios;
CREATE TRIGGER sync_condominio_sindicos
  AFTER INSERT OR UPDATE OF sindico_id, sindico_esposa_id ON condominios
  FOR EACH ROW
  EXECUTE FUNCTION sync_condominio_sindico_functions();
