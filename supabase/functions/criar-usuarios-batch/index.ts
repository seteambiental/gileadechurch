import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MemberData {
  id: string;
  full_name: string;
  email: string | null;
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

// Mapeamento de function_type para app_role
const FUNCTION_TO_ROLE: Record<string, string> = {
  lider_casa_refugio: "lider_casa_refugio",
  supervisor_casa_refugio: "supervisor_casa_refugio",
  secretario_casa_refugio: "secretario_casa_refugio",
  lider_ministerio: "lider_ministerio",
  integrante_ministerio: "integrante_ministerio",
  pastor_geral: "pastor_geral",
  pastor_auxiliar: "pastor_auxiliar",
  supervisor_condominio: "lider_condominio",
  sindico_condominio: "lider_condominio",
};

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller has full access
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: hasAccess, error: accessErr } = await authClient.rpc('has_full_access');
    if (accessErr || !hasAccess) {
      return new Response(JSON.stringify({ error: 'Proibido' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Buscar membros sem user_id (com email OU com CPF)
    const { data: members, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email, cpf, whatsapp")
      .is("user_id", null)
      .eq("excluido", false)
      .order("full_name");

    if (fetchError) {
      throw new Error(`Erro ao buscar membros: ${fetchError.message}`);
    }

    // Filtrar apenas quem tem email ou CPF
    const eligibleMembers = (members || []).filter(
      (m: MemberData) => (m.email && m.email.trim() !== "") || (m.cpf && m.cpf.replace(/\D/g, "").length >= 11)
    );

    console.log(`Encontrados ${eligibleMembers.length} membros elegíveis sem usuário`);

    const results = {
      total: eligibleMembers.length,
      created: 0,
      linked: 0,
      rolesAssigned: 0,
      skipped: 0,
      errors: [] as { name: string; error: string }[],
    };

    // Buscar todos os usuários existentes
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const usersByEmail = new Map(
      existingUsers?.users?.map((u) => [u.email?.toLowerCase(), u.id]) || []
    );

    // Buscar member_functions para atribuição de roles
    const memberIds = eligibleMembers.map((m: MemberData) => m.id);
    const { data: allFunctions } = await supabaseAdmin
      .from("member_functions")
      .select("member_id, function_type")
      .in("member_id", memberIds.length > 0 ? memberIds : ["__none__"]);

    const functionsByMember = new Map<string, string[]>();
    (allFunctions || []).forEach((f: any) => {
      const existing = functionsByMember.get(f.member_id) || [];
      existing.push(f.function_type);
      functionsByMember.set(f.member_id, existing);
    });

    for (const member of eligibleMembers as MemberData[]) {
      try {
        const cpfDigits = (member.cpf || "").replace(/\D/g, "");
        
        // Determinar o email de login
        let loginEmail = member.email?.trim().toLowerCase() || "";
        
        // Se não tem email, usar CPF@gileade.app
        if (!loginEmail && cpfDigits.length >= 11) {
          loginEmail = `${cpfDigits}@gileade.app`;
        }

        if (!loginEmail) {
          results.skipped++;
          continue;
        }

        // Verificar se já existe usuário com este email
        const existingUserId = usersByEmail.get(loginEmail);

        let userId: string;

        if (existingUserId) {
          // Vincular usuário existente ao membro
          const { error: updateError } = await supabaseAdmin
            .from("members")
            .update({ user_id: existingUserId })
            .eq("id", member.id);

          if (updateError) {
            results.errors.push({ name: member.full_name, error: `Erro ao vincular: ${updateError.message}` });
            continue;
          }
          userId = existingUserId;
          results.linked++;
          console.log(`Vinculado: ${member.full_name} (${loginEmail})`);
        } else {
          // Gerar senha padrão: iniciais + 6 primeiros dígitos do CPF
          const nameParts = (member.full_name || "").trim().split(/\s+/);
          const iniciais = nameParts.length >= 2
            ? nameParts[0][0].toUpperCase() + nameParts[nameParts.length - 1][0].toLowerCase()
            : "";
          const defaultPassword = cpfDigits.length >= 6 && iniciais.length === 2
            ? iniciais + cpfDigits.slice(0, 6)
            : generateSecurePassword(14);

          // Criar novo usuário
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: loginEmail,
            password: defaultPassword,
            email_confirm: true,
            user_metadata: {
              member_id: member.id,
              perfil: "membro",
            },
          });

          if (createError) {
            results.errors.push({ name: member.full_name, error: createError.message });
            console.error(`Erro ao criar ${member.full_name}: ${createError.message}`);
            continue;
          }

          userId = newUser.user.id;

          // Vincular user_id ao membro
          const { error: updateError } = await supabaseAdmin
            .from("members")
            .update({ user_id: userId })
            .eq("id", member.id);

          if (updateError) {
            results.errors.push({ name: member.full_name, error: `Usuário criado mas erro ao vincular: ${updateError.message}` });
            continue;
          }

          results.created++;
          console.log(`Criado: ${member.full_name} (${loginEmail})`);
        }

        // Atribuir roles baseadas em member_functions
        const memberFunctions = functionsByMember.get(member.id) || [];
        const rolesToAssign = new Set<string>();

        for (const funcType of memberFunctions) {
          const role = FUNCTION_TO_ROLE[funcType];
          if (role) rolesToAssign.add(role);
        }

        // Sempre adicionar 'membro' como role base
        rolesToAssign.add("membro");

        for (const role of rolesToAssign) {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

          if (!roleError) {
            results.rolesAssigned++;
          }
        }

      } catch (memberError) {
        results.errors.push({ name: member.full_name, error: String(memberError) });
      }
    }

    console.log(`Resultado: ${results.created} criados, ${results.linked} vinculados, ${results.rolesAssigned} roles, ${results.errors.length} erros`);

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
