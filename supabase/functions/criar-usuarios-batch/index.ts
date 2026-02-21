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

function generateSecurePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const pick = (set: string, b: number) => set[b % set.length];
  const pwdChars: string[] = [pick(upper, bytes[0]), pick(lower, bytes[1]), pick(digits, bytes[2]), pick(symbols, bytes[3])];
  for (let i = pwdChars.length; i < length; i++) pwdChars.push(pick(all, bytes[i]));
  for (let i = pwdChars.length - 1; i > 0; i--) { const j = bytes[i] % (i + 1); [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]]; }
  return pwdChars.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: authErr } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: hasAccess, error: accessErr } = await authClient.rpc('has_full_access');
    if (accessErr || !hasAccess) {
      return new Response(JSON.stringify({ error: 'Proibido' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

        // Gerar senha segura criptograficamente
        const defaultPassword = generateSecurePassword(14);

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
