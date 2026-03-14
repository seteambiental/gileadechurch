import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

interface RequestBody {
  email: string;
  auth_email?: string;
  cpf?: string | null;
  member_id: string;
  perfil?: string;
}

async function enviarMensagemZAPI(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  
  console.log(`Enviando mensagem de boas-vindas para: ${phoneFormatted}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_CLIENT_TOKEN || '',
    },
    body: JSON.stringify({
      phone: phoneFormatted,
      message: mensagem,
    }),
  });
  
  const result = await response.json();
  console.log('Resposta Z-API:', result);
  
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao enviar mensagem');
  }
  
  return result;
}

function gerarMensagemBoasVindasMembro(nome: string, loginEmail: string, realEmail: string | null, isCpfPassword: boolean, isCpfLogin: boolean) {
  const primeiroNome = nome.split(' ')[0];

  const senhaInfo = isCpfPassword
    ? `🔑 Senha: *Os 6 primeiros dígitos do seu CPF + Gc!*\n_(Exemplo: se CPF começa com 123456, a senha é 123456Gc!)_`
    : `🔑 Senha temporária foi enviada separadamente. Consulte a secretaria.`;

  const loginInfo = isCpfLogin
    ? `📧 Login: ${loginEmail}\n_(login gerado a partir do seu CPF)_`
    : `📧 Email: ${loginEmail}`;

  return `🎉 *Bem-vindo(a) à Igreja Gileade, ${primeiroNome}!*

Seu cadastro foi realizado com sucesso! 🙏

📱 *Acesse nosso sistema:*
🔗 https://gileadechurch.lovable.app

🔐 *Seus dados de acesso:*
${loginInfo}
${senhaInfo}

⚠️ *Importante:* por segurança, altere sua senha após o primeiro acesso.

Estamos muito felizes em ter você conosco!

_Igreja Gileade_ 💙`;
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
  const pwdChars: string[] = [
    pick(upper, bytes[0]),
    pick(lower, bytes[1]),
    pick(digits, bytes[2]),
    pick(symbols, bytes[3]),
  ];

  for (let i = pwdChars.length; i < length; i++) {
    pwdChars.push(pick(all, bytes[i]));
  }

  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: _claims, error: _authErr } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (_authErr || !_claims?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, auth_email, cpf: _cpf, member_id, perfil } = await req.json() as RequestBody;

    const { data: hasAccess, error: accessErr } = await _authClient.rpc('has_full_access');
    if (accessErr || !hasAccess) {
      return new Response(JSON.stringify({ error: 'Proibido' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Buscar CPF do membro para gerar senha padrão (6 primeiros dígitos)
    const { data: memberCpfData } = await supabaseAdmin
      .from("members")
      .select("cpf")
      .eq("id", member_id)
      .single();

    const cpfDigits = (memberCpfData?.cpf || "").replace(/\D/g, "");
    const defaultPassword = cpfDigits.length >= 6
      ? cpfDigits.slice(0, 6)
      : generateSecurePassword(14);

    // Verificar se membro já tem user_id vinculado
    const { data: usersByEmail } = await supabaseAdmin
      .from("members")
      .select("user_id")
      .eq("id", member_id)
      .single();
    
    if (usersByEmail?.user_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Membro já possui usuário vinculado",
          user_id: usersByEmail.user_id,
          was_existing: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar qual email usar para autenticação
    // Se auth_email foi informado (ex: CPF@gileade.app para familiares), usar esse
    const loginEmail = auth_email || email;
    const isCpfLogin = !!auth_email && auth_email !== email;

    // Criar novo usuário com o email de login
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: loginEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        member_id: member_id,
        perfil: perfil || "membro",
        real_email: email,
        is_cpf_login: isCpfLogin,
      },
    });

    if (createError) {
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        let page = 1;
        let found = null;
        while (!found) {
          const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
          if (!usersPage?.users?.length) break;
          found = usersPage.users.find((u: any) => u.email === loginEmail);
          if (usersPage.users.length < 50) break;
          page++;
        }
        if (found) {
          await supabaseAdmin.from("members").update({ user_id: found.id }).eq("id", member_id);
          return new Response(
            JSON.stringify({ success: true, message: "Usuário já existia e foi vinculado", user_id: found.id, was_existing: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
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
    }

    // Buscar dados do membro para enviar WhatsApp
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("members")
      .select("full_name, whatsapp")
      .eq("id", member_id)
      .single();

    const nomeCompleto = memberData?.full_name || "Novo Membro";

    // Enviar WhatsApp de boas-vindas
    if (!memberError && memberData?.whatsapp) {
      try {
        const isCpfPassword = cpfDigits.length >= 6;
        const mensagem = gerarMensagemBoasVindasMembro(
          nomeCompleto,
          loginEmail,
          email,
          isCpfPassword,
          isCpfLogin
        );
        await enviarMensagemZAPI(memberData.whatsapp, mensagem);
        console.log("Mensagem de boas-vindas enviada com sucesso para:", memberData.whatsapp);
      } catch (whatsappError) {
        console.error("Erro ao enviar WhatsApp de boas-vindas:", whatsappError);
      }
    } else {
      console.log("WhatsApp não disponível para o membro, mensagem não enviada");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isCpfLogin ? "Usuário criado com login por CPF" : "Usuário criado com sucesso",
        user_id: newUser.user.id,
        was_existing: false,
        login_email: loginEmail,
        is_cpf_login: isCpfLogin,
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
