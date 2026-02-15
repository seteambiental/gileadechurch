
-- Tabela de ambientes/salas
CREATE TABLE public.ambientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade INTEGER,
  foto_url TEXT,
  recursos TEXT[], -- projetor, TV, quadro, etc.
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ambientes" ON public.ambientes FOR SELECT USING (true);
CREATE POLICY "Admins can insert ambientes" ON public.ambientes FOR INSERT WITH CHECK (has_full_access());
CREATE POLICY "Admins can update ambientes" ON public.ambientes FOR UPDATE USING (has_full_access());
CREATE POLICY "Admins can delete ambientes" ON public.ambientes FOR DELETE USING (has_full_access());

-- Tabela de reservas
CREATE TABLE public.reservas_ambientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ambiente_id UUID NOT NULL REFERENCES public.ambientes(id) ON DELETE CASCADE,
  solicitante_id UUID REFERENCES public.members(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_reserva DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  tipo_recorrencia TEXT, -- semanal, quinzenal, mensal
  data_fim_recorrencia DATE,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, rejeitado, cancelado
  aprovador_id UUID REFERENCES public.members(id),
  motivo_rejeicao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservas_ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view reservas" ON public.reservas_ambientes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert reservas" ON public.reservas_ambientes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins and approvers can update reservas" ON public.reservas_ambientes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete reservas" ON public.reservas_ambientes FOR DELETE USING (has_full_access());

-- Triggers para updated_at
CREATE TRIGGER update_ambientes_updated_at BEFORE UPDATE ON public.ambientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reservas_ambientes_updated_at BEFORE UPDATE ON public.reservas_ambientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
