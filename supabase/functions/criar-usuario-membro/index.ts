import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  cpf?: string | null;
  member_id: string;
  perfil?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, cpf, member_id, perfil } = await req.json() as RequestBody;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!member_id) {
      return new Response(
        JSON.stringify({ error: "ID do membro é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar senha padrão: 4 primeiros dígitos do CPF ou 1234
    const cpfDigits = cpf ? cpf.replace(/\D/g, "") : "";
    const defaultPassword = cpfDigits.length >= 4 ? cpfDigits.substring(0, 4) : "1234";

    // Criar cliente com service role para operações admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar se já existe usuário com este email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      // Usuário já existe, apenas vincular ao membro
      const { error: updateError } = await supabaseAdmin
        .from("members")
        .update({ user_id: existingUser.id })
        .eq("id", member_id);

      if (updateError) {
        console.error("Erro ao vincular usuário existente:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao vincular usuário existente", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário já existia e foi vinculado ao membro",
          user_id: existingUser.id,
          was_existing: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar novo usuário
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true, // Auto confirmar email
      user_metadata: {
        member_id: member_id,
        perfil: perfil || "membro",
      },
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário", details: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vincular user_id ao membro
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({ user_id: newUser.user.id })
      .eq("id", member_id);

    if (updateError) {
      console.error("Erro ao vincular usuário ao membro:", updateError);
      // Não retornar erro pois o usuário foi criado com sucesso
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Usuário criado com sucesso",
        user_id: newUser.user.id,
        default_password: defaultPassword,
        was_existing: false
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
