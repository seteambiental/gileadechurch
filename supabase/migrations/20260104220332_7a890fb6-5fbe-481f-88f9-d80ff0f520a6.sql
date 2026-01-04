-- Tabela de tarefas do ministério de serviços (Dorcas)
CREATE TABLE public.servico_tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_tarefa DATE NOT NULL,
  hora_inicio TIME,
  hora_fim TIME,
  local TEXT,
  vagas_necessarias INTEGER DEFAULT 1,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  criado_por UUID REFERENCES public.members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de voluntários das tarefas
CREATE TABLE public.servico_tarefa_voluntarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.servico_tarefas(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'recusado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna evento_id na tabela novos_convertidos para vincular conversões a eventos
ALTER TABLE public.novos_convertidos 
ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES public.agenda_igreja(id);

-- Enable RLS
ALTER TABLE public.servico_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servico_tarefa_voluntarios ENABLE ROW LEVEL SECURITY;

-- Policies para servico_tarefas
CREATE POLICY "Authenticated users can view tarefas" ON public.servico_tarefas
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tarefas" ON public.servico_tarefas
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tarefas" ON public.servico_tarefas
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete tarefas" ON public.servico_tarefas
FOR DELETE TO authenticated USING (true);

-- Policies para servico_tarefa_voluntarios
CREATE POLICY "Authenticated users can view voluntarios" ON public.servico_tarefa_voluntarios
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert voluntarios" ON public.servico_tarefa_voluntarios
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update voluntarios" ON public.servico_tarefa_voluntarios
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete voluntarios" ON public.servico_tarefa_voluntarios
FOR DELETE TO authenticated USING (true);

-- Trigger para update_at
CREATE TRIGGER update_servico_tarefas_updated_at
BEFORE UPDATE ON public.servico_tarefas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();