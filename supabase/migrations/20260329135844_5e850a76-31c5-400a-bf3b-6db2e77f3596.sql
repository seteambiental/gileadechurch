
-- Tabela de professores e auxiliares do Jiu-Jitsu
CREATE TABLE public.jiujitsu_professores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL DEFAULT 'professor', -- 'professor' ou 'auxiliar'
  faixa_etaria TEXT NOT NULL, -- '6-9', '10-13', '14+'
  turma_id UUID REFERENCES public.jiujitsu_turmas(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.jiujitsu_professores ENABLE ROW LEVEL SECURITY;

-- Políticas: acesso para admins/pastores e líderes de ministério
CREATE POLICY "Admins e pastores podem gerenciar professores jiujitsu"
  ON public.jiujitsu_professores
  FOR ALL
  TO authenticated
  USING (has_full_access())
  WITH CHECK (has_full_access());

CREATE POLICY "Líderes de ministério podem gerenciar professores jiujitsu"
  ON public.jiujitsu_professores
  FOR ALL
  TO authenticated
  USING (is_lider_ministerio())
  WITH CHECK (is_lider_ministerio());

CREATE POLICY "Membros autenticados podem visualizar professores jiujitsu"
  ON public.jiujitsu_professores
  FOR SELECT
  TO authenticated
  USING (true);

-- Trigger updated_at
CREATE TRIGGER update_jiujitsu_professores_updated_at
  BEFORE UPDATE ON public.jiujitsu_professores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
