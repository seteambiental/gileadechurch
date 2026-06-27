import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANA_MEMBER_ID = "1ece6c2a-17fe-4a4a-b71a-14a72d619272";
const ANA_EMAIL = "ana.zackcell@gmail.com";
const ANA_SENHA = "Ar059500";

const SARAH_USER_ID = "05d6f99d-1c8b-4c4f-ae8f-9703596c48ca";
const SARAH_SENHA = "Sr128352";

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
    const { data: claims, error: authErr } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: hasAccess } = await authClient.rpc("has_full_access");
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Proibido" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resultado: Record<string, unknown> = {};

    // 1) Sarah mantém a conta compartilhada -> ajusta senha
    const { error: sarahErr } = await admin.auth.admin.updateUserById(
      SARAH_USER_ID,
      { password: SARAH_SENHA }
    );
    resultado.sarah = sarahErr
      ? { status: "erro", erro: sarahErr.message }
      : { status: "senha_atualizada", login: "anasaraisac@icloud.com", senha: SARAH_SENHA };

    // 2) Ana Paula -> conta própria
    let anaUserId: string | null = null;
    const { data: newUser, error: createErr } =
      await admin.auth.admin.createUser({
        email: ANA_EMAIL,
        password: ANA_SENHA,
        email_confirm: true,
        user_metadata: { member_id: ANA_MEMBER_ID, real_email: ANA_EMAIL },
      });

    if (createErr) {
      // email já registrado -> localizar e reaproveitar
      if (
        createErr.message?.includes("already") ||
        createErr.message?.includes("registered")
      ) {
        let page = 1;
        let found: any = null;
        while (!found) {
          const { data: usersPage } = await admin.auth.admin.listUsers({
            page,
            perPage: 200,
          });
          if (!usersPage?.users?.length) break;
          found = usersPage.users.find((u: any) => u.email === ANA_EMAIL);
          if (usersPage.users.length < 200) break;
          page++;
        }
        if (found) {
          anaUserId = found.id;
          await admin.auth.admin.updateUserById(found.id, { password: ANA_SENHA });
        }
      }
      if (!anaUserId) {
        resultado.ana = { status: "erro", erro: createErr.message };
        return new Response(JSON.stringify({ success: false, resultado }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      anaUserId = newUser.user.id;
    }

    await admin
      .from("members")
      .update({ user_id: anaUserId })
      .eq("id", ANA_MEMBER_ID);

    resultado.ana = {
      status: "conta_propria_vinculada",
      login: ANA_EMAIL,
      senha: ANA_SENHA,
      user_id: anaUserId,
    };

    return new Response(JSON.stringify({ success: true, resultado }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});