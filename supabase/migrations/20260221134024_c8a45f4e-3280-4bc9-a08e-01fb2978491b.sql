
-- Tabela de escalas de serviço para Recepção e Estacionamento
CREATE TABLE public.escalas_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  data_culto DATE NOT NULL,
  tipo_culto TEXT NOT NULL CHECK (tipo_culto IN ('celebracao', 'ceia', 'quarta')),
  tipo_escala TEXT NOT NULL CHECK (tipo_escala IN ('individual', 'casa_refugio')),
  -- Para candidatura individual
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  -- Para candidatura de Casa Refúgio
  casa_refugio_id UUID REFERENCES public.casas_refugio(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Uma candidatura individual por culto por ministério
  UNIQUE (ministry_id, data_culto, tipo_culto, member_id),
  -- Máximo controle de CRs por culto
  UNIQUE (ministry_id, data_culto, tipo_culto, casa_refugio_id)
);

-- Membros escalados (populado quando CR é aprovada)
CREATE TABLE public.escala_servico_membros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escala_id UUID NOT NULL REFERENCES public.escalas_servico(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (escala_id, member_id)
);

-- Enable RLS
ALTER TABLE public.escalas_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_servico_membros ENABLE ROW LEVEL SECURITY;

-- RLS policies for escalas_servico
CREATE POLICY "Authenticated users can view escalas_servico"
  ON public.escalas_servico FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin/pastor can manage all escalas_servico"
  ON public.escalas_servico FOR ALL
  TO authenticated USING (has_full_access())
  WITH CHECK (has_full_access());

CREATE POLICY "Ministry leaders can manage their escalas_servico"
  ON public.escalas_servico FOR ALL
  TO authenticated
  USING (is_ministry_leader(ministry_id))
  WITH CHECK (is_ministry_leader(ministry_id));

CREATE POLICY "Members can insert their own candidatura"
  ON public.escalas_servico FOR INSERT
  TO authenticated
  WITH CHECK (
    tipo_escala = 'individual' 
    AND member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "CR leaders can insert casa_refugio candidatura"
  ON public.escalas_servico FOR INSERT
  TO authenticated
  WITH CHECK (
    tipo_escala = 'casa_refugio'
    AND EXISTS (
      SELECT 1 FROM public.casas_refugio cr
      INNER JOIN public.members m ON m.user_id = auth.uid()
      WHERE cr.id = escalas_servico.casa_refugio_id
        AND (cr.lider_id = m.id OR cr.lider_esposa_id = m.id)
    )
  );

-- RLS policies for escala_servico_membros
CREATE POLICY "Authenticated users can view escala_servico_membros"
  ON public.escala_servico_membros FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin/pastor can manage escala_servico_membros"
  ON public.escala_servico_membros FOR ALL
  TO authenticated USING (has_full_access())
  WITH CHECK (has_full_access());

CREATE POLICY "Ministry leaders can manage escala_servico_membros"
  ON public.escala_servico_membros FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.escalas_servico es
      WHERE es.id = escala_servico_membros.escala_id
        AND is_ministry_leader(es.ministry_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.escalas_servico es
      WHERE es.id = escala_servico_membros.escala_id
        AND is_ministry_leader(es.ministry_id)
    )
  );

-- Trigger updated_at
CREATE TRIGGER update_escalas_servico_updated_at
  BEFORE UPDATE ON public.escalas_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
