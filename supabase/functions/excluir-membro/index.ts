import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  memberId?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // client com token do usuário apenas para identificar quem chamou
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { memberId } = (await req.json()) as Body;
    if (!memberId) {
      return new Response(JSON.stringify({ error: "memberId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Operação privilegiada (bypass RLS), mas autorizada por perfil
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "pastor_geral", "pastor_auxiliar"])
      .limit(1);

    if (roleErr || !roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirma existência e pega possíveis vínculos
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("members")
      .select("id, full_name, user_id")
      .eq("id", memberId)
      .maybeSingle();

    if (memberErr) throw memberErr;
    if (!member) {
      return new Response(JSON.stringify({ success: true, deleted: false, reason: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Quebra vínculos onde faz sentido manter histórico
    await supabaseAdmin.from("evangelizacao_frentes").update({ lider_id: null }).eq("lider_id", memberId);
    await supabaseAdmin.from("kids_escalas").update({ lider_id: null }).eq("lider_id", memberId);
    await supabaseAdmin.from("impacto_departamentos").update({ lider_id: null }).eq("lider_id", memberId);
    await supabaseAdmin.from("acao_social_ajudas").update({ registrado_por: null }).eq("registrado_por", memberId);
    await supabaseAdmin.from("kids_presencas").update({ registrado_por: null }).eq("registrado_por", memberId);
    await supabaseAdmin.from("acao_social_familias").update({ lider_responsavel_id: null }).eq("lider_responsavel_id", memberId);
    await supabaseAdmin.from("ministerio_escalas_compartilhadas").update({ compartilhado_por: null }).eq("compartilhado_por", memberId);
    await supabaseAdmin.from("servico_tarefas").update({ criado_por: null }).eq("criado_por", memberId);

    // Casais: mantém histórico, remove vínculo
    await supabaseAdmin.from("casais_inscritos").update({ membro_feminino_id: null }).eq("membro_feminino_id", memberId);
    await supabaseAdmin.from("casais_inscritos").update({ membro_masculino_id: null }).eq("membro_masculino_id", memberId);
    await supabaseAdmin.from("casais_lideres").update({ membro_feminino_id: null }).eq("membro_feminino_id", memberId);
    await supabaseAdmin.from("casais_lideres").update({ membro_masculino_id: null }).eq("membro_masculino_id", memberId);

    // 2) Deleta registros diretamente vinculados
    await supabaseAdmin.from("member_functions").delete().eq("member_id", memberId);
    await supabaseAdmin.from("ministerio_integrantes").delete().eq("member_id", memberId);
    await supabaseAdmin.from("candidaturas_ministerio").delete().eq("member_id", memberId);
    await supabaseAdmin.from("danca_equipe_membros").delete().eq("member_id", memberId);
    await supabaseAdmin.from("member_face_indexes").delete().eq("member_id", memberId);
    await supabaseAdmin.from("encontro_presencas").delete().eq("member_id", memberId);
    await supabaseAdmin.from("inscricoes_eventos").delete().eq("member_id", memberId);
    await supabaseAdmin.from("kids_presencas").delete().eq("member_id", memberId);
    await supabaseAdmin.from("kids_responsaveis").delete().or(`responsavel_member_id.eq.${memberId},crianca_member_id.eq.${memberId}`);
    await supabaseAdmin.from("kids_lideres").delete().eq("member_id", memberId);
    await supabaseAdmin.from("kids_escalas_ajudantes").delete().eq("ajudante_id", memberId);
    await supabaseAdmin.from("impacto_inscricoes").delete().eq("member_id", memberId);
    await supabaseAdmin.from("impacto_equipe_membros").delete().eq("member_id", memberId);
    await supabaseAdmin.from("evangelizacao_frentes_membros").delete().eq("membro_id", memberId);
    await supabaseAdmin.from("servico_tarefa_voluntarios").delete().eq("member_id", memberId);
    await supabaseAdmin.from("missoes_mocambique_contribuintes").delete().eq("member_id", memberId);
    await supabaseAdmin.from("user_access_requests").delete().eq("member_id", memberId);
    await supabaseAdmin.from("member_requests").delete().eq("member_id", memberId);

    // Novos convertidos (FK set null, mas garantimos limpeza)
    await supabaseAdmin.from("novos_convertidos").update({ member_id: null }).eq("member_id", memberId);
    await supabaseAdmin.from("novos_convertidos").update({ membro_vinculado_id: null }).eq("membro_vinculado_id", memberId);

    // 3) Por último, deleta o membro
    const { data: deleted, error: delErr } = await supabaseAdmin
      .from("members")
      .delete()
      .eq("id", memberId)
      .select("id");

    if (delErr) {
      console.error("Delete member error:", delErr);
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deletedOk = (deleted?.length ?? 0) > 0;

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedOk,
        member: { id: member.id, full_name: member.full_name, user_id: member.user_id },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("excluir-membro error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
