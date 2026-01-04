-- Corrigir linter: Extension in Public (pg_net)
-- pg_net não suporta ALTER EXTENSION ... SET SCHEMA, então recriamos no schema "extensions".

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    -- Recriação segura: remover e reinstalar no schema correto
    DROP EXTENSION pg_net;
    CREATE EXTENSION pg_net WITH SCHEMA extensions;
  END IF;
END$$;