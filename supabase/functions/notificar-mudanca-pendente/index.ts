import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID");
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN");
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificacaoRequest {
  mudanca_id: string;
}

const tipoMudancaLabels: Record<string, string> = {
  lider_ministerio: "Líder de Ministério",
  lider_esposa_ministerio: "Líder de Ministério",
  integrante_ministerio: "Integrante de Ministério",
  lider_casa_refugio: "Líder de Casa Refúgio",
  lider_esposa_casa_refugio: "Líder de Casa Refúgio",
  supervisor_casa_refugio: "Supervisor de Casa Refúgio",
  supervisor_esposa_casa_refugio: "Supervisor de Casa Refúgio",
  anfitriao_casa_refugio: "Anfitrião de Casa Refúgio",
  anfitriao_esposa_casa_refugio: "Anfitrião de Casa Refúgio",
  sindico_condominio: "Síndico de Condomínio",
  sindico_esposa_condominio: "Síndico de Condomínio",
};

const acaoLabels: Record<string, string> = {
  adicionar: "Adicionar",
  remover: "Remover",
  alterar: "Alterar",
};

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Igreja Gileade <noreply@gileadechurch.com.br>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Erro ao enviar email: ${errorData}`);
  }

  return response.json();
}

async function enviarWhatsApp(telefone: string, mensagem: string) {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
    console.log("Credenciais Z-API não configuradas, pulando WhatsApp");
    return null;
  }

  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  console.log(`Enviando WhatsApp para: ${phoneFormatted}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN || "",
    },
    body: JSON.stringify({
      phone: phoneFormatted,
      message: mensagem,
    }),
  });

  const result = await response.json();
  console.log("Resposta Z-API:", result);

  if (!response.ok) {
    throw new Error(result.message || "Erro ao enviar WhatsApp");
  }

  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: _claims, error: _authErr } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (_authErr || !_claims?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { mudanca_id }: NotificacaoRequest = await req.json();

    if (!mudanca_id) {
      throw new Error("mudanca_id é obrigatório");
    }

    // Buscar dados da mudança pendente
    const { data: mudanca, error: mudancaError } = await supabase
      .from("mudancas_pendentes")
      .select(`
        *,
        membro:members!mudancas_pendentes_membro_id_fkey(id, full_name, email),
        membro_atual:members!mudancas_pendentes_membro_atual_id_fkey(id, full_name),
        aprovador:members!mudancas_pendentes_aprovador_id_fkey(id, full_name, email, whatsapp),
        ministry:ministries(id, name),
        casa_refugio:casas_refugio(id, name),
        condominio:condominios(id, name),
        solicitante:members!mudancas_pendentes_solicitante_id_fkey(id, full_name)
      `)
      .eq("id", mudanca_id)
      .single();

    if (mudancaError || !mudanca) {
      console.error("Erro ao buscar mudança:", mudancaError);
      throw new Error("Mudança não encontrada");
    }

    const aprovadorEmail = (mudanca.aprovador as Record<string, string> | null)?.email;
    const aprovadorNome = (mudanca.aprovador as Record<string, string> | null)?.full_name || "Aprovador";
    const aprovadorWhatsapp = (mudanca.aprovador as Record<string, string> | null)?.whatsapp;

    const tipoLabel = tipoMudancaLabels[mudanca.tipo_mudanca as string] || mudanca.tipo_mudanca;
    const acaoLabel = acaoLabels[mudanca.acao as string] || mudanca.acao;

    let entidadeNome = "";
    if (mudanca.ministry) {
      entidadeNome = `Ministério ${(mudanca.ministry as Record<string, string>).name}`;
    } else if (mudanca.casa_refugio) {
      entidadeNome = `Casa Refúgio ${(mudanca.casa_refugio as Record<string, string>).name}`;
    } else if (mudanca.condominio) {
      entidadeNome = `Condomínio ${(mudanca.condominio as Record<string, string>).name}`;
    }

    const membroNome = (mudanca.membro as Record<string, string> | null)?.full_name || "Membro não identificado";
    const membroAtualNome = (mudanca.membro_atual as Record<string, string> | null)?.full_name;
    const solicitanteNome = (mudanca.solicitante as Record<string, string> | null)?.full_name || "Sistema";

    let emailEnviado = false;
    let whatsappEnviado = false;

    // ==================== ENVIAR EMAIL ====================
    if (aprovadorEmail) {
      try {
        let descricaoSubstituicao = "";
        if (mudanca.acao === "alterar" && membroAtualNome) {
          descricaoSubstituicao = `
            <tr>
              <td style="padding: 8px 0; color: #6c757d;">Substituindo:</td>
              <td style="padding: 8px 0; font-weight: bold;">${membroAtualNome}</td>
            </tr>
          `;
        }

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Aprovação Pendente</h1>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
              <p style="margin-top: 0;">Olá <strong>${aprovadorNome}</strong>,</p>
              
              <p>Há uma solicitação de mudança aguardando sua aprovação:</p>
              
              <div style="background-color: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6c757d; width: 140px;">Ação:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${acaoLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6c757d;">Tipo:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${tipoLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6c757d;">Local:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${entidadeNome}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6c757d;">Membro:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${membroNome}</td>
                  </tr>
                  ${descricaoSubstituicao}
                  <tr>
                    <td style="padding: 8px 0; color: #6c757d;">Solicitado por:</td>
                    <td style="padding: 8px 0;">${solicitanteNome}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #6c757d; font-size: 14px;">
                Acesse o Portal Ministério para aprovar ou rejeitar esta solicitação.
              </p>
            </div>
            
            <div style="background-color: #e9ecef; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d;">
              <p style="margin: 0;">Igreja Gileade - Sistema de Gestão</p>
            </div>
          </div>
        `;

        await sendEmail(
          aprovadorEmail,
          `[Aprovação Pendente] ${acaoLabel} ${tipoLabel}`,
          htmlContent
        );
        emailEnviado = true;
        console.log("Email enviado com sucesso");
      } catch (emailError) {
        console.error("Erro ao enviar email:", emailError);
      }
    } else {
      console.log("Aprovador não tem email cadastrado");
    }

    // ==================== ENVIAR WHATSAPP ====================
    if (aprovadorWhatsapp) {
      try {
        const primeiroNome = aprovadorNome.split(" ")[0];
        let substituicaoTexto = "";
        if (mudanca.acao === "alterar" && membroAtualNome) {
          substituicaoTexto = `\n🔄 Substituindo: *${membroAtualNome}*`;
        }

        const mensagemWhatsapp = `📋 *APROVAÇÃO PENDENTE*\n\nOlá, ${primeiroNome}! Há uma solicitação aguardando sua aprovação:\n\n📌 *Ação:* ${acaoLabel}\n👤 *Tipo:* ${tipoLabel}\n🏠 *Local:* ${entidadeNome}\n👤 *Membro:* ${membroNome}${substituicaoTexto}\n📝 *Solicitado por:* ${solicitanteNome}\n\nAcesse o *Portal Ministério* para aprovar ou rejeitar.\n\n_Igreja Gileade_ 💙`;

        await enviarWhatsApp(aprovadorWhatsapp, mensagemWhatsapp);
        whatsappEnviado = true;
        console.log("WhatsApp enviado com sucesso");
      } catch (whatsappError) {
        console.error("Erro ao enviar WhatsApp:", whatsappError);
      }
    } else {
      console.log("Aprovador não tem WhatsApp cadastrado");
    }

    // Atualizar registro para marcar notificações como enviadas
    await supabase
      .from("mudancas_pendentes")
      .update({
        email_enviado: emailEnviado || whatsappEnviado,
        data_email_enviado: (emailEnviado || whatsappEnviado) ? new Date().toISOString() : null,
      })
      .eq("id", mudanca_id);

    return new Response(
      JSON.stringify({ success: true, emailEnviado, whatsappEnviado }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na função notificar-mudanca-pendente:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
