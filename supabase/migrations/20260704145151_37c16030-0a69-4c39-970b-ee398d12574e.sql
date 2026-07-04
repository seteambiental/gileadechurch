CREATE TABLE public.evento_inscricoes_acessos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id uuid NOT NULL REFERENCES public.agenda_igreja(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_inscricoes_acessos TO authenticated;
GRANT ALL ON public.evento_inscricoes_acessos TO service_role;

ALTER TABLE public.evento_inscricoes_acessos ENABLE ROW LEVEL SECURITY;

-- Managers (full access or ministry request managers) can do everything
CREATE POLICY "Managers manage event access"
  ON public.evento_inscricoes_acessos
  FOR ALL
  TO authenticated
  USING (has_full_access() OR can_manage_member_requests())
  WITH CHECK (has_full_access() OR can_manage_member_requests());

-- A granted member can read their own access rows
CREATE POLICY "Granted member reads own access"
  ON public.evento_inscricoes_acessos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = evento_inscricoes_acessos.member_id
        AND m.user_id = auth.uid()
    )
  );

-- Allow granted members to read the inscriptions of events they have access to
CREATE POLICY "Granted members can view event inscriptions"
  ON public.inscricoes_eventos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.evento_inscricoes_acessos a
      INNER JOIN public.members m ON m.id = a.member_id
      WHERE a.evento_id = inscricoes_eventos.evento_id
        AND m.user_id = auth.uid()
    )
  );