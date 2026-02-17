
-- Backfill references for existing inscriptions
WITH ranked AS (
  SELECT i.id, e.prefixo_referencia, EXTRACT(YEAR FROM e.data_inicio)::TEXT as ano,
         ROW_NUMBER() OVER (PARTITION BY i.evento_id ORDER BY i.created_at, i.nome) as seq
  FROM impacto_inscricoes i
  JOIN impacto_eventos e ON e.id = i.evento_id
  WHERE e.prefixo_referencia IS NOT NULL
    AND i.referencia IS NULL
)
UPDATE impacto_inscricoes
SET referencia = ranked.prefixo_referencia || '-' || LPAD(ranked.seq::TEXT, 3, '0') || '-' || ranked.ano
FROM ranked
WHERE impacto_inscricoes.id = ranked.id;
