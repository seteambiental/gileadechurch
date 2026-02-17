import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

interface RequestBody {
  member_id: string;
  email: string;
  nome: string;
  senha?: string;
}

async function enviarEmailBoasVindas(email: string, nome: string, senha: string) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada");
  }

  const resend = new Resend(RESEND_API_KEY);
  const primeiroNome = nome.split(' ')[0];

  const emailResponse = await resend.emails.send({
    from: "Igreja Gileade <onboarding@resend.dev>",
    to: [email],
    subject: "Bem-vindo(a) à Igreja Gileade! 🙏",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1e40af;">🎉 Bem-vindo(a), ${primeiroNome}!</h1>
        </div>
        
        <p style="font-size: 16px; color: #333;">Seu cadastro foi realizado com sucesso!</p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">📱 Acesse nosso sistema:</h3>
          <p style="margin: 10px 0;">
            <a href="https://gileadechurch.lovable.app" style="color: #2563eb; font-weight: bold;">
              https://gileadechurch.lovable.app
            </a>
          </p>
          
          <h3 style="color: #1e40af;">🔐 Seus dados de acesso:</h3>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Senha:</strong> ${senha}</p>
        </div>
        
        <p style="font-size: 14px; color: #666; background-color: #fef3c7; padding: 10px; border-radius: 4px;">
          ⚠️ <strong>Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso.
        </p>
        
        <p style="font-size: 16px; color: #333; margin-top: 20px;">
          Estamos muito felizes em ter você conosco!
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #1e40af; font-weight: bold;">Igreja Gileade 💙</p>
          <p style="font-size: 12px; color: #666;">Um lugar de cura e restauração</p>
        </div>
      </div>
    `,
  });

  return emailResponse;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, nome, senha }: RequestBody = await req.json();

    if (!email || !nome) {
      return new Response(
        JSON.stringify({ success: false, error: "Email e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se não foi fornecida senha, usar mensagem padrão
    const senhaParaEnviar = senha || "Cpf@XXXXXX (verifique com a secretaria)";

    const result = await enviarEmailBoasVindas(email, nome, senhaParaEnviar);

    console.log("Email de boas-vindas enviado com sucesso para:", email);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao enviar email:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
