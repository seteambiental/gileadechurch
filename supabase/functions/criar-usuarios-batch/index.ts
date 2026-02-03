import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemberData {
  id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  whatsapp: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Buscar membros sem user_id que têm email
    const { data: members, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, cpf, whatsapp")
      .is("user_id", null)
      .not("email", "is", null)
      .neq("email", "")
      .order("full_name");

    if (fetchError) {
      throw new Error(`Erro ao buscar membros: ${fetchError.message}`);
    }

    console.log(`Encontrados ${members?.length || 0} membros sem usuário`);

    const results = {
      total: members?.length || 0,
      created: 0,
      linked: 0,
      errors: [] as { email: string; error: string }[],
    };

    // Buscar todos os usuários existentes
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const usersByEmail = new Map(
      existingUsers?.users?.map((u) => [u.email?.toLowerCase(), u.id]) || []
    );

    for (const member of (members || []) as MemberData[]) {
      try {
        const emailLower = member.email.toLowerCase();
        
        // Verificar se já existe usuário com este email
        const existingUserId = usersByEmail.get(emailLower);

        if (existingUserId) {
          // Vincular usuário existente ao membro
          const { error: updateError } = await supabaseAdmin
            .from("members")
            .update({ user_id: existingUserId })
            .eq("id", member.id);

          if (updateError) {
            results.errors.push({ email: member.email, error: `Erro ao vincular: ${updateError.message}` });
          } else {
            results.linked++;
            console.log(`Vinculado: ${member.email}`);
          }
          continue;
        }

        // Gerar senha padrão: 6 primeiros dígitos do CPF ou 123456
        const cpfDigits = member.cpf ? member.cpf.replace(/\D/g, "") : "";
        const defaultPassword = cpfDigits.length >= 6 ? cpfDigits.substring(0, 6) : "123456";

        // Criar novo usuário
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: member.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            member_id: member.id,
            perfil: "membro",
          },
        });

        if (createError) {
          results.errors.push({ email: member.email, error: createError.message });
          console.error(`Erro ao criar ${member.email}: ${createError.message}`);
          continue;
        }

        // Vincular user_id ao membro
        const { error: updateError } = await supabaseAdmin
          .from("members")
          .update({ user_id: newUser.user.id })
          .eq("id", member.id);

        if (updateError) {
          results.errors.push({ email: member.email, error: `Usuário criado mas erro ao vincular: ${updateError.message}` });
        } else {
          results.created++;
          console.log(`Criado: ${member.email} com senha ${defaultPassword}`);
        }
      } catch (memberError) {
        results.errors.push({ email: member.email, error: String(memberError) });
      }
    }

    console.log(`Resultado: ${results.created} criados, ${results.linked} vinculados, ${results.errors.length} erros`);

    return new Response(
      JSON.stringify(results),
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
