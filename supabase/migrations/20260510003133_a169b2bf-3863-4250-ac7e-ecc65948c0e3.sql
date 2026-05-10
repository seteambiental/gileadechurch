-- Limpar eventos repetidos de Apresentação de Crianças, mantendo o evento único mais recente
WITH original AS (
  SELECT id
  FROM public.agenda_igreja
  WHERE tipo_evento = 'apresentacao_criancas'
     OR lower(coalesce(titulo, '')) LIKE '%apresenta%crian%'
  ORDER BY
    CASE WHEN tipo_evento = 'apresentacao_criancas' AND recorrente IS NOT TRUE THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT 1
)
DELETE FROM public.agenda_igreja a
WHERE (a.tipo_evento = 'apresentacao_criancas'
   OR lower(coalesce(a.titulo, '')) LIKE '%apresenta%crian%')
  AND a.id <> (SELECT id FROM original);

-- Garantir que Apresentação de Crianças nunca seja salva como recorrente
CREATE OR REPLACE FUNCTION public.enforce_apresentacao_criancas_single_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_evento = 'apresentacao_criancas' THEN
    NEW.recorrente := false;
    NEW.tipo_recorrencia := NULL;
    NEW.dia_semana := NULL;
    NEW.semana_mes := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_apresentacao_criancas_single_event ON public.agenda_igreja;

CREATE TRIGGER trg_enforce_apresentacao_criancas_single_event
BEFORE INSERT OR UPDATE ON public.agenda_igreja
FOR EACH ROW
EXECUTE FUNCTION public.enforce_apresentacao_criancas_single_event();