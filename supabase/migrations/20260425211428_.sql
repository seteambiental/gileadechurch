-- Remove duplicatas inconsistentes de "Conexão Líder" (recorrente=true sem dia_semana)
-- Estes registros causavam duplicação visual no Google Calendar
UPDATE public.agenda_igreja
SET ativo = false
WHERE id IN (
  'c1c4ee96-e94f-4aad-8d63-b6bedd3f3abb',
  '61b15b32-64f5-438e-bed6-beb07ebe2dbc'
);
