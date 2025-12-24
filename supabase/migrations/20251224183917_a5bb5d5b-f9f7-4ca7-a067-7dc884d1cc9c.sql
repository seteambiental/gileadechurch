
-- Adicionar campos para eventos recorrentes e flyers
ALTER TABLE public.agenda_igreja 
ADD COLUMN IF NOT EXISTS recorrente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tipo_recorrencia text, -- semanal, mensal, semestral
ADD COLUMN IF NOT EXISTS dia_semana integer, -- 0=domingo, 1=segunda, etc
ADD COLUMN IF NOT EXISTS semana_mes integer, -- 1=primeira semana, 2=segunda, etc (para ceia todo 1o domingo)
ADD COLUMN IF NOT EXISTS flyer_url text,
ADD COLUMN IF NOT EXISTS observacoes text,
ADD COLUMN IF NOT EXISTS cor text DEFAULT '#dc2626'; -- cor do evento no calendário

-- Inserir programação fixa
INSERT INTO public.agenda_igreja (titulo, descricao, data_evento, hora_inicio, hora_fim, tipo_evento, recorrente, tipo_recorrencia, dia_semana, local, genero_alvo, cor)
VALUES 
  ('Culto de Celebração', 'Culto dominical de celebração', CURRENT_DATE, '19:00', '21:30', 'culto', true, 'semanal', 0, 'Igreja Gileade', 'todos', '#dc2626'),
  ('Culto de Quarta com Propósito', 'Culto semanal às quartas-feiras', CURRENT_DATE, '20:00', '21:30', 'culto', true, 'semanal', 3, 'Igreja Gileade', 'todos', '#2563eb');

-- Inserir ceia (1o domingo de cada mês)
INSERT INTO public.agenda_igreja (titulo, descricao, data_evento, hora_inicio, hora_fim, tipo_evento, recorrente, tipo_recorrencia, dia_semana, semana_mes, local, genero_alvo, cor)
VALUES 
  ('Santa Ceia', 'Celebração da Santa Ceia - todo 1º domingo do mês', CURRENT_DATE, '19:00', '21:30', 'ceia', true, 'mensal', 0, 1, 'Igreja Gileade', 'todos', '#7c3aed');
