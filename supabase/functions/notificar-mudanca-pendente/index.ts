import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
        aprovador:members!mudancas_pendentes_aprovador_id_fkey(id, full_name, email),
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

    // Verificar se o aprovador tem email
    const aprovadorEmail = (mudanca.aprovador as Record<string, string> | null)?.email;
    const aprovadorNome = (mudanca.aprovador as Record<string, string> | null)?.full_name || "Aprovador";

    if (!aprovadorEmail) {
      console.log("Aprovador não tem email cadastrado, pulando envio");
      return new Response(
        JSON.stringify({ success: true, message: "Aprovador sem email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Montar informações do email
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
            Acesse o painel administrativo da igreja para aprovar ou rejeitar esta solicitação.
          </p>
        </div>
        
        <div style="background-color: #e9ecef; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d;">
          <p style="margin: 0;">Igreja Gileade - Sistema de Gestão</p>
        </div>
      </div>
    `;

    // Enviar email
    const emailResponse = await sendEmail(
      aprovadorEmail,
      `[Aprovação Pendente] ${acaoLabel} ${tipoLabel}`,
      htmlContent
    );

    console.log("Email enviado:", emailResponse);

    // Atualizar registro para marcar email como enviado
    await supabase
      .from("mudancas_pendentes")
      .update({
        email_enviado: true,
        data_email_enviado: new Date().toISOString(),
      })
      .eq("id", mudanca_id);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
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
