
CREATE TABLE public.kids_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crianca_member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  crianca_novo_convertido_id uuid REFERENCES public.novos_convertidos(id) ON DELETE CASCADE,
  turma public.kids_turma NOT NULL,
  data_culto date NOT NULL DEFAULT CURRENT_DATE,
  tipo_culto text NOT NULL DEFAULT 'domingo',
  token text UNIQUE NOT NULL,
  responsavel_member_id uuid REFERENCES public.members(id),
  responsavel_nome text,
  crianca_nome text NOT NULL,
  check_me_at timestamptz DEFAULT now(),
  check_in_at timestamptz,
  check_in_by uuid REFERENCES public.members(id),
  check_out_at timestamptz,
  check_out_by uuid REFERENCES public.members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.kids_checkins ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view checkins" ON public.kids_checkins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert checkins" ON public.kids_checkins
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update checkins" ON public.kids_checkins
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Anon pode ver checkins (para scan de QR sem login do professor)
CREATE POLICY "Anon can view checkins by token" ON public.kids_checkins
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can update checkins" ON public.kids_checkins
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_kids_checkins_updated_at
  BEFORE UPDATE ON public.kids_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
