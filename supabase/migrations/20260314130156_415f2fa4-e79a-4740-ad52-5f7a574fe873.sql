
-- Tabela de turmas de Jiu-Jitsu
CREATE TABLE public.jiujitsu_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria_idade text NOT NULL DEFAULT 'Kids (4-15)',
  faixa_minima text NOT NULL DEFAULT 'Branca',
  faixa_maxima text NOT NULL DEFAULT 'Preta',
  dia_semana text,
  horario text,
  lider_id uuid REFERENCES public.members(id),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiujitsu_turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read jiujitsu_turmas"
  ON public.jiujitsu_turmas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage jiujitsu_turmas"
  ON public.jiujitsu_turmas FOR ALL TO authenticated
  USING (public.has_full_access())
  WITH CHECK (public.has_full_access());

-- Tabela de inscrições de Jiu-Jitsu
CREATE TABLE public.jiujitsu_inscricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  data_nascimento text,
  whatsapp text,
  email text,
  cpf text,
  tipo text NOT NULL DEFAULT 'visitante',
  member_id uuid REFERENCES public.members(id),
  turma_id uuid REFERENCES public.jiujitsu_turmas(id),
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiujitsu_inscricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read jiujitsu_inscricoes"
  ON public.jiujitsu_inscricoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can insert jiujitsu_inscricoes"
  ON public.jiujitsu_inscricoes FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can manage jiujitsu_inscricoes"
  ON public.jiujitsu_inscricoes FOR UPDATE TO authenticated
  USING (public.has_full_access())
  WITH CHECK (public.has_full_access());

CREATE POLICY "Admin can delete jiujitsu_inscricoes"
  ON public.jiujitsu_inscricoes FOR DELETE TO authenticated
  USING (public.has_full_access());

-- Add turma_id column to jiujitsu_alunos
ALTER TABLE public.jiujitsu_alunos ADD COLUMN turma_id uuid REFERENCES public.jiujitsu_turmas(id);
