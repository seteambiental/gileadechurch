
-- Tabela de alunos de Jiu-Jitsu
CREATE TABLE public.jiujitsu_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  data_nascimento text,
  endereco text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  whatsapp text,
  email text,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,
  tipo_sanguineo text,
  faixa text NOT NULL DEFAULT 'Branca',
  graus integer NOT NULL DEFAULT 0,
  foto_url text,
  tipo text NOT NULL DEFAULT 'visitante',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiujitsu_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access users can manage jiujitsu_alunos" ON public.jiujitsu_alunos
  FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());

CREATE POLICY "Authenticated users can view jiujitsu_alunos" ON public.jiujitsu_alunos
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_jiujitsu_alunos_updated_at BEFORE UPDATE ON public.jiujitsu_alunos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabela de pagamentos
CREATE TABLE public.jiujitsu_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.jiujitsu_alunos(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  data_pagamento text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiujitsu_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access users can manage jiujitsu_pagamentos" ON public.jiujitsu_pagamentos
  FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());

CREATE POLICY "Authenticated users can view jiujitsu_pagamentos" ON public.jiujitsu_pagamentos
  FOR SELECT TO authenticated USING (true);

-- Tabela de graduações
CREATE TABLE public.jiujitsu_graduacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.jiujitsu_alunos(id) ON DELETE CASCADE,
  faixa_anterior text,
  faixa_nova text NOT NULL,
  graus integer NOT NULL DEFAULT 0,
  data_graduacao text NOT NULL,
  professor text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jiujitsu_graduacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access users can manage jiujitsu_graduacoes" ON public.jiujitsu_graduacoes
  FOR ALL TO authenticated USING (has_full_access()) WITH CHECK (has_full_access());

CREATE POLICY "Authenticated users can view jiujitsu_graduacoes" ON public.jiujitsu_graduacoes
  FOR SELECT TO authenticated USING (true);
