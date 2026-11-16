-- Acesso aos dados da igreja apenas para contas ligadas a um cadastro ativo ou com papel atribuído.
CREATE OR REPLACE FUNCTION public.is_church_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.members m WHERE m.user_id = auth.uid() AND m.excluido IS NOT TRUE)
  )
$$;
REVOKE ALL ON FUNCTION public.is_church_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_church_user() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.casal_inscricao_pendente_recente(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.casais_inscritos c WHERE c.id = _id AND c.status = 'pendente' AND c.created_at > now() - interval '2 hours')
$$;
REVOKE ALL ON FUNCTION public.casal_inscricao_pendente_recente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.casal_inscricao_pendente_recente(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.solicitacao_membro_pendente_recente(_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.member_requests r WHERE r.id = _id AND r.status = 'pendente' AND r.created_at > now() - interval '2 hours')
$$;
REVOKE ALL ON FUNCTION public.solicitacao_membro_pendente_recente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitacao_membro_pendente_recente(uuid) TO anon, authenticated, service_role;

-- Leitura pública só do necessário: lista de ministérios (id e nome) e check-in infantil por código.
CREATE OR REPLACE FUNCTION public.listar_ministerios_publico()
RETURNS TABLE(id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.name FROM public.ministries m ORDER BY m.name
$$;
REVOKE ALL ON FUNCTION public.listar_ministerios_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_ministerios_publico() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.kids_checkin_por_token(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(c) || jsonb_build_object('turma_nome_exibicao', t.nome_exibicao, 'turma_cor_hex', t.cor_hex)
  FROM public.kids_checkins c
  LEFT JOIN public.kids_turmas_config t ON t.turma::text = c.turma::text
  WHERE _token IS NOT NULL AND length(_token) >= 8 AND c.token = _token
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.kids_checkin_por_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kids_checkin_por_token(text) TO anon, authenticated, service_role;

-- Regras específicas (formulários e páginas públicas)
ALTER POLICY "Anyone can view agenda_igreja" ON public.agenda_igreja TO anon, authenticated USING ((ativo IS NOT FALSE AND status = 'aprovado') OR (select public.is_church_user()));
ALTER POLICY "Inscricao publica de apresentacao" ON public.apresentacao_criancas TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (status = 'pendente' AND certificado_emitido IS NOT TRUE AND member_id IS NULL AND data_apresentacao IS NULL AND length(trim(crianca_nome)) > 0));
ALTER POLICY "Inscrição pública de apresentação de crianças" ON public.apresentacao_criancas_inscricoes TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (evento_id IS NOT NULL AND length(trim(crianca_nome)) > 0 AND EXISTS (SELECT 1 FROM public.agenda_igreja a WHERE a.id = evento_id AND a.ativo IS NOT FALSE)));
ALTER POLICY "Anyone can insert casais_inscritos" ON public.casais_inscritos TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (status = 'pendente' AND certificado_emitido IS NOT TRUE AND data_certificado IS NULL));
ALTER POLICY "Anyone can insert casais_inscritos_filhos" ON public.casais_inscritos_filhos TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (member_id IS NULL AND public.casal_inscricao_pendente_recente(inscricao_id)));
ALTER POLICY "Anyone can view casas_refugio" ON public.casas_refugio TO anon, authenticated USING (ativo IS NOT FALSE OR (select public.is_church_user()));
ALTER POLICY "Homepage avisos são públicos para leitura" ON public.homepage_avisos TO anon, authenticated USING (ativo = true OR (select public.is_church_user()));
ALTER POLICY "Anyone can insert jiujitsu_inscricoes" ON public.jiujitsu_inscricoes TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (status = 'pendente' AND turma_id IS NULL));
ALTER POLICY "Full access users can select jiujitsu_pagamentos" ON public.jiujitsu_pagamentos TO authenticated USING ((select public.has_full_access()));
DROP POLICY IF EXISTS "Anon can view checkins by token" ON public.kids_checkins;
ALTER POLICY "Public can insert member_request_filhos" ON public.member_request_filhos TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR public.solicitacao_membro_pendente_recente(member_request_id));
ALTER POLICY "Anyone can submit member request" ON public.member_requests TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (status = 'pendente' AND aprovado_por IS NULL AND aprovado_em IS NULL AND member_id IS NULL AND motivo_rejeicao IS NULL));
ALTER POLICY "Anyone can insert prayer requests" ON public.pedidos_oracao TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (status = 'aberto' AND length(trim(pedido)) BETWEEN 1 AND 5000));
ALTER POLICY "Anyone can insert testimonies" ON public.testemunhos TO anon, authenticated WITH CHECK ((select public.is_church_user()) OR (aprovado IS NOT TRUE AND arquivado IS NOT TRUE));
ALTER POLICY "Admins can view all user_roles" ON public.user_roles TO authenticated USING (user_id = auth.uid() OR (select public.is_church_user()));

-- Regras que só exigiam "estar logado" (ou nenhuma condição) passam a exigir conta ligada à igreja.
DO $$
DECLARE
  p record;
  stmt text;
  chk constant text := '(select public.is_church_user())';
BEGIN
  FOR p IN
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY['acao_social_ajudas', 'acao_social_familia_membros', 'acao_social_familias', 'acao_social_instituicoes', 'agenda_ambientes', 'agenda_igreja', 'aniversarios_enviados', 'apresentacao_criancas', 'apresentacao_criancas_inscricoes', 'casais_inscritos', 'casais_inscritos_filhos', 'casais_lideres', 'casais_materiais', 'casais_pagamentos', 'casais_presencas', 'casais_professores', 'casais_turmas', 'casas_refugio', 'casas_refugio_dia_historico', 'condominios', 'cr_express', 'danca_equipe_membros', 'danca_equipes', 'encontro_presencas', 'encontros_casa_refugio', 'escala_servico_membros', 'escalas_servico', 'evangelizacao_eventos', 'evangelizacao_frentes', 'evangelizacao_frentes_membros', 'homepage_avisos', 'homepage_carrossel', 'homepage_config', 'homepage_videos', 'impacto_departamentos', 'impacto_despesas', 'impacto_equipe_membros', 'impacto_eventos', 'impacto_inscricoes', 'inscricoes_eventos', 'jiujitsu_alunos', 'jiujitsu_graduacoes', 'jiujitsu_inscricoes', 'jiujitsu_pagamentos', 'kids_checkins', 'kids_escalas', 'kids_escalas_ajudantes', 'kids_lideres', 'kids_notificacoes_config', 'kids_transicoes', 'kids_turmas_config', 'louvor_musicas', 'member_face_indexes', 'member_functions', 'member_request_filhos', 'member_requests', 'members', 'mensagens_whatsapp', 'ministerio_escala_membros', 'ministerio_escalas', 'ministerio_escalas_compartilhadas', 'ministerio_funcoes', 'ministerio_integrantes', 'ministerio_musicas_banco', 'ministries', 'missoes_mocambique_config', 'missoes_mocambique_contribuicoes', 'missoes_mocambique_contribuintes', 'missoes_mocambique_cotacao_cache', 'missoes_mocambique_despesas', 'missoes_mocambique_fechamentos', 'missoes_mocambique_lancamentos', 'mudancas_pendentes', 'pedidos_oracao', 'reservas_ambientes', 'servico_tarefa_voluntarios', 'servico_tarefas', 'teologia_despesas', 'testemunhos', 'user_roles'])
      AND (qual IN ('true', '(auth.uid() IS NOT NULL)') OR with_check IN ('true', '(auth.uid() IS NOT NULL)'))
      AND (tablename, policyname) NOT IN (
        ('homepage_config', 'Homepage config é público para leitura'),
        ('agenda_ambientes', 'Anyone can view agenda_ambientes'),
        ('casais_materiais', 'Anyone can view casais_materiais'),
        ('homepage_videos', 'Anyone can view homepage_videos'),
        ('impacto_departamentos', 'Anyone can view impacto_departamentos'),
        ('impacto_eventos', 'Anyone can view impacto_eventos'),
        ('louvor_musicas', 'Anyone can view louvor_musicas')
      )
  LOOP
    stmt := format('ALTER POLICY %I ON public.%I TO authenticated', p.policyname, p.tablename);
    IF p.qual IS NOT NULL THEN stmt := stmt || ' USING (' || chk || ')'; END IF;
    IF p.with_check IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || chk || ')'; END IF;
    EXECUTE stmt;
  END LOOP;
END $$;

-- Arquivos: só contas ligadas à igreja podem enviar, alterar, apagar ou ler arquivos internos
ALTER POLICY "Anyone can upload member photos" ON storage.objects TO anon, authenticated WITH CHECK (bucket_id = 'member-photos' AND ((select public.is_church_user()) OR (position('/' in name) = 0 AND name ~ '^(inscricao_|apresentacao_|solicitacao_|[0-9]+\.)' AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','heic','heif','gif'))));
ALTER POLICY "Authenticated users can delete cr-express files" ON storage.objects TO authenticated USING (bucket_id = 'cr-express-files' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can delete encontros photos" ON storage.objects TO authenticated USING (bucket_id = 'encontros-fotos' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can delete member photos" ON storage.objects TO authenticated USING (bucket_id = 'member-photos' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can delete sistema images" ON storage.objects TO authenticated USING (bucket_id = 'sistema-solicitacoes' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can read cr-express files" ON storage.objects TO authenticated USING (bucket_id = 'cr-express-files' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can update member photos" ON storage.objects TO authenticated USING (bucket_id = 'member-photos' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can upload cr-express files" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'cr-express-files' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can upload encontros photos" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'encontros-fotos' AND (select public.is_church_user()));
ALTER POLICY "Authenticated users can upload sistema images" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'sistema-solicitacoes' AND (select public.is_church_user()));
ALTER POLICY "Usuários autenticados podem atualizar logos" ON storage.objects TO authenticated USING (bucket_id = 'logos' AND (select public.is_church_user()));
ALTER POLICY "Usuários autenticados podem deletar logos" ON storage.objects TO authenticated USING (bucket_id = 'logos' AND (select public.is_church_user()));
ALTER POLICY "Usuários autenticados podem fazer upload de logos" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'logos' AND (select public.is_church_user()));
ALTER POLICY "WhatsApp anexos upload autenticado" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'whatsapp-anexos' AND (select public.is_church_user()));
