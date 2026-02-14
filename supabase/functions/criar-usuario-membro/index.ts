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

function gerarMensagemBoasVindasMembro(nome: string, email: string, senha: string) {
  const primeiroNome = nome.split(' ')[0];
  
  return `🎉 *Bem-vindo(a) à Igreja Gileade, ${primeiroNome}!*

Seu cadastro foi realizado com sucesso! 🙏

📱 *Acesse nosso sistema:*
🔗 https://gileadechurch.lovable.app

🔐 *Seus dados de acesso:*
📧 Email: ${email}
🔑 Senha: ${senha}

⚠️ *Importante:* Sua senha é "Cpf@" seguido dos 6 primeiros dígitos do seu CPF. Recomendamos que você altere sua senha no primeiro acesso.

Estamos muito felizes em ter você conosco!

_Igreja Gileade_ 💙`;
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

    // Gerar senha padrão: 6 primeiros dígitos do CPF ou 123456
    const cpfDigits = cpf ? cpf.replace(/\D/g, "") : "";
    const defaultPassword = cpfDigits.length >= 6 ? cpfDigits.substring(0, 6) : "123456";

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

    // Verificar se membro já tem user_id vinculado
    const { data: usersByEmail } = await supabaseAdmin
      .from("members")
      .select("user_id")
      .eq("id", member_id)
      .single();
    
    if (usersByEmail?.user_id) {
      // Membro já tem user_id vinculado
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

    // Criar novo usuário
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        member_id: member_id,
        perfil: perfil || "membro",
      },
    });

    if (createError) {
      // Se o email já existe no auth, tentar buscar e vincular
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        // Buscar todos os users e encontrar pelo email
        let page = 1;
        let found = null;
        while (!found) {
          const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
          if (!usersPage?.users?.length) break;
          found = usersPage.users.find((u: any) => u.email === email);
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
      // Não retornar erro pois o usuário foi criado com sucesso
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
        const mensagem = gerarMensagemBoasVindasMembro(
          nomeCompleto,
          email,
          defaultPassword
        );
        await enviarMensagemZAPI(memberData.whatsapp, mensagem);
        console.log("Mensagem de boas-vindas enviada com sucesso para:", memberData.whatsapp);
      } catch (whatsappError) {
        console.error("Erro ao enviar WhatsApp de boas-vindas:", whatsappError);
        // Não retornar erro pois o usuário foi criado com sucesso
      }
    } else {
      console.log("WhatsApp não disponível para o membro, mensagem não enviada");
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
