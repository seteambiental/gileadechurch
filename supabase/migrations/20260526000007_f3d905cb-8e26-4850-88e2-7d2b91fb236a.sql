
-- ============================================================
-- SECURITY HARDENING MIGRATION
-- Fixes RLS findings from security scan
-- ============================================================

-- ============================================================
-- 1) user_roles: prevent privilege escalation
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Only admins can manage user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 2) user_access_requests: scoped CRUD
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view access requests" ON public.user_access_requests;
DROP POLICY IF EXISTS "Anyone can insert access requests" ON public.user_access_requests;
DROP POLICY IF EXISTS "Anyone can update access requests" ON public.user_access_requests;
DROP POLICY IF EXISTS "Anyone can delete access requests" ON public.user_access_requests;

CREATE POLICY "Admins and owners can view access requests"
  ON public.user_access_requests FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_master()
    OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can insert their own access requests"
  ON public.user_access_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "Only admins can update access requests"
  ON public.user_access_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR public.is_master())
  WITH CHECK (public.is_admin() OR public.is_master());

CREATE POLICY "Only admins can delete access requests"
  ON public.user_access_requests FOR DELETE
  TO authenticated
  USING (public.is_admin() OR public.is_master());

-- ============================================================
-- 3) igreja_config: remove anon write access (keep public SELECT)
-- ============================================================
DROP POLICY IF EXISTS "Anon can manage igreja_config" ON public.igreja_config;

-- ============================================================
-- 4) acao_social_* : restrict to authenticated users
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view acao_social_familias" ON public.acao_social_familias;
DROP POLICY IF EXISTS "Authenticated users can insert acao_social_familias" ON public.acao_social_familias;
DROP POLICY IF EXISTS "Authenticated users can update acao_social_familias" ON public.acao_social_familias;
DROP POLICY IF EXISTS "Authenticated users can delete acao_social_familias" ON public.acao_social_familias;
CREATE POLICY "Authenticated can view acao_social_familias"
  ON public.acao_social_familias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert acao_social_familias"
  ON public.acao_social_familias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update acao_social_familias"
  ON public.acao_social_familias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete acao_social_familias"
  ON public.acao_social_familias FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view acao_social_familia_membros" ON public.acao_social_familia_membros;
DROP POLICY IF EXISTS "Authenticated users can insert acao_social_familia_membros" ON public.acao_social_familia_membros;
DROP POLICY IF EXISTS "Authenticated users can update acao_social_familia_membros" ON public.acao_social_familia_membros;
DROP POLICY IF EXISTS "Authenticated users can delete acao_social_familia_membros" ON public.acao_social_familia_membros;
CREATE POLICY "Authenticated can view acao_social_familia_membros"
  ON public.acao_social_familia_membros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert acao_social_familia_membros"
  ON public.acao_social_familia_membros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update acao_social_familia_membros"
  ON public.acao_social_familia_membros FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete acao_social_familia_membros"
  ON public.acao_social_familia_membros FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view acao_social_instituicoes" ON public.acao_social_instituicoes;
DROP POLICY IF EXISTS "Authenticated users can insert acao_social_instituicoes" ON public.acao_social_instituicoes;
DROP POLICY IF EXISTS "Authenticated users can update acao_social_instituicoes" ON public.acao_social_instituicoes;
DROP POLICY IF EXISTS "Authenticated users can delete acao_social_instituicoes" ON public.acao_social_instituicoes;
CREATE POLICY "Authenticated can view acao_social_instituicoes"
  ON public.acao_social_instituicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert acao_social_instituicoes"
  ON public.acao_social_instituicoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update acao_social_instituicoes"
  ON public.acao_social_instituicoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete acao_social_instituicoes"
  ON public.acao_social_instituicoes FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 5) casais_inscritos: keep public INSERT (registration form),
--    restrict SELECT to authenticated staff
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view casais_inscritos" ON public.casais_inscritos;
CREATE POLICY "Authenticated can view casais_inscritos"
  ON public.casais_inscritos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view casais_inscritos_filhos" ON public.casais_inscritos_filhos;
CREATE POLICY "Authenticated can view casais_inscritos_filhos"
  ON public.casais_inscritos_filhos FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6) impacto_inscricoes: keep public INSERT, restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view impacto_inscricoes" ON public.impacto_inscricoes;
CREATE POLICY "Authenticated can view impacto_inscricoes"
  ON public.impacto_inscricoes FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 7) inscricoes_eventos: keep public INSERT, restrict SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view inscricoes" ON public.inscricoes_eventos;
CREATE POLICY "Authenticated can view inscricoes"
  ON public.inscricoes_eventos FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 8) kids_checkins: remove unrestricted anon UPDATE
-- (anon SELECT kept; token-based public check-in flow requires it)
-- ============================================================
DROP POLICY IF EXISTS "Anon can update checkins" ON public.kids_checkins;

-- ============================================================
-- 9) kids_notificacoes_log: restrict SELECT to kids staff/admins
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view kids_notificacoes_log" ON public.kids_notificacoes_log;
CREATE POLICY "Kids staff can view notificacoes log"
  ON public.kids_notificacoes_log FOR SELECT
  TO authenticated
  USING (public.can_access_kids_data());

DROP POLICY IF EXISTS "Authenticated users can insert kids_notificacoes_log" ON public.kids_notificacoes_log;
CREATE POLICY "Kids staff can insert notificacoes log"
  ON public.kids_notificacoes_log FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_kids_data());

-- ============================================================
-- 10) member_request_filhos: replace public ALL with proper scoping
-- (public INSERT during registration; staff-only SELECT/UPDATE/DELETE)
-- ============================================================
DROP POLICY IF EXISTS "Service role full access on member_request_filhos" ON public.member_request_filhos;

CREATE POLICY "Public can insert member_request_filhos"
  ON public.member_request_filhos FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can view member_request_filhos"
  ON public.member_request_filhos FOR SELECT
  TO authenticated
  USING (public.can_manage_member_requests());

CREATE POLICY "Staff can update member_request_filhos"
  ON public.member_request_filhos FOR UPDATE
  TO authenticated
  USING (public.can_manage_member_requests())
  WITH CHECK (public.can_manage_member_requests());

CREATE POLICY "Staff can delete member_request_filhos"
  ON public.member_request_filhos FOR DELETE
  TO authenticated
  USING (public.can_manage_member_requests());
