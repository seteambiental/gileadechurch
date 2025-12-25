-- Criar enum para turmas do Kids
CREATE TYPE public.kids_turma AS ENUM ('laranja', 'amarelo', 'verde', 'azul');

-- Tabela para configuração das turmas Kids
CREATE TABLE public.kids_turmas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma kids_turma NOT NULL UNIQUE,
  nome_exibicao text NOT NULL,
  cor_hex text NOT NULL,
  idade_minima integer NOT NULL,
  idade_maxima integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir configurações das turmas
INSERT INTO public.kids_turmas_config (turma, nome_exibicao, cor_hex, idade_minima, idade_maxima) VALUES
  ('laranja', 'Laranja', '#f97316', 4, 5),
  ('amarelo', 'Amarelo', '#eab308', 6, 7),
  ('verde', 'Verde', '#22c55e', 8, 9),
  ('azul', 'Azul', '#3b82f6', 10, 11);

-- Tabela para líderes/professores do Kids
CREATE TABLE public.kids_lideres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  turma kids_turma NOT NULL,
  funcao text NOT NULL DEFAULT 'professor', -- professor, auxiliar, coordenador
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(member_id, turma)
);

-- Tabela para registro de presença nas turmas Kids
CREATE TABLE public.kids_presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  novo_convertido_id uuid REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  turma kids_turma NOT NULL,
  data_culto date NOT NULL,
  tipo_culto text NOT NULL DEFAULT 'domingo', -- domingo, quarta, especial
  presente boolean NOT NULL DEFAULT true,
  observacoes text,
  registrado_por uuid REFERENCES public.members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT check_pessoa CHECK (member_id IS NOT NULL OR novo_convertido_id IS NOT NULL)
);

-- Índices para performance
CREATE INDEX idx_kids_presencas_data ON public.kids_presencas(data_culto);
CREATE INDEX idx_kids_presencas_turma ON public.kids_presencas(turma);
CREATE INDEX idx_kids_presencas_member ON public.kids_presencas(member_id);
CREATE INDEX idx_kids_presencas_novo_convertido ON public.kids_presencas(novo_convertido_id);
CREATE INDEX idx_kids_lideres_turma ON public.kids_lideres(turma);

-- Habilitar RLS
ALTER TABLE public.kids_turmas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_lideres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_presencas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para kids_turmas_config (todos podem ver, apenas autenticados modificam)
CREATE POLICY "Anyone can view kids_turmas_config"
  ON public.kids_turmas_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update kids_turmas_config"
  ON public.kids_turmas_config FOR UPDATE
  USING (true);

-- Políticas RLS para kids_lideres
CREATE POLICY "Authenticated users can view kids_lideres"
  ON public.kids_lideres FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert kids_lideres"
  ON public.kids_lideres FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kids_lideres"
  ON public.kids_lideres FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete kids_lideres"
  ON public.kids_lideres FOR DELETE
  USING (true);

-- Políticas RLS para kids_presencas
CREATE POLICY "Authenticated users can view kids_presencas"
  ON public.kids_presencas FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert kids_presencas"
  ON public.kids_presencas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update kids_presencas"
  ON public.kids_presencas FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete kids_presencas"
  ON public.kids_presencas FOR DELETE
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_kids_turmas_config_updated_at
  BEFORE UPDATE ON public.kids_turmas_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kids_lideres_updated_at
  BEFORE UPDATE ON public.kids_lideres
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();