import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await authClient.auth.getClaims(token);
    const user = claimsData?.claims ? { id: claimsData.claims.sub as string } : null;
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apenas Admin ou Pastor Geral
    const { data: roles } = await authClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "pastor_geral");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Proibido" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Listar todos os usuários do Auth (paginado)
    const authUsers: Array<{ id: string; email: string | null; last_sign_in_at: string | null; created_at: string }> = [];
    let page = 1;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const users = data?.users || [];
      for (const u of users) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          created_at: u.created_at,
        });
      }
      if (users.length < 200) break;
      page++;
      if (page > 50) break; // safety
    }

    const userMap = new Map(authUsers.map(u => [u.id, u]));

    // Buscar membros (não excluídos)
    const { data: members, error: mErr } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, whatsapp, cpf, user_id, excluido")
      .or("excluido.is.null,excluido.eq.false")
      .order("full_name", { ascending: true });
    if (mErr) throw mErr;

    const result = (members || []).map((m: any) => {
      const authUser = m.user_id ? userMap.get(m.user_id) : null;
      return {
        member_id: m.id,
        full_name: m.full_name,
        email: m.email,
        whatsapp: m.whatsapp,
        cpf: m.cpf,
        user_id: m.user_id,
        login_email: authUser?.email ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        user_created_at: authUser?.created_at ?? null,
        has_access: !!m.user_id,
      };
    });

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro listar-acessos-membros:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});