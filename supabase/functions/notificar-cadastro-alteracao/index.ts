import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificacaoRequest {
  tipo: "cadastro" | "alteracao";
  membro_id?: string;
  membro_nome: string;
  membro_email?: string;
  gestor_email?: string;
  gestor_nome?: string;
  detalhes?: string;
  campos_alterados?: string[];
}

serve(async (req) => {
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

    const body: NotificacaoRequest = await req.json();
    const { tipo, membro_nome, membro_email, gestor_email, gestor_nome, detalhes, campos_alterados } = body;

    console.log("Notificação recebida:", { tipo, membro_nome, membro_email, gestor_email });

    const emailsEnviados: string[] = [];
    const erros: string[] = [];

    // Template do email
    const assunto = tipo === "cadastro" 
      ? `Novo Cadastro: ${membro_nome}`
      : `Alteração de Cadastro: ${membro_nome}`;

    const conteudoBase = tipo === "cadastro"
      ? `
        <h2>Novo Cadastro Realizado</h2>
        <p><strong>Nome:</strong> ${membro_nome}</p>
        ${detalhes ? `<p><strong>Detalhes:</strong> ${detalhes}</p>` : ""}
        <p>Um novo cadastro foi realizado no sistema da Igreja Gileade.</p>
      `
      : `
        <h2>Alteração de Cadastro</h2>
        <p><strong>Nome:</strong> ${membro_nome}</p>
        ${campos_alterados && campos_alterados.length > 0 
          ? `<p><strong>Campos alterados:</strong> ${campos_alterados.join(", ")}</p>` 
          : ""}
        ${detalhes ? `<p><strong>Detalhes:</strong> ${detalhes}</p>` : ""}
        <p>Uma alteração foi realizada no cadastro acima no sistema da Igreja Gileade.</p>
      `;

    // Email para o gestor
    if (gestor_email) {
      try {
        const htmlGestor = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .footer { background: #1a365d; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
              h2 { color: #1a365d; margin-top: 0; }
              strong { color: #1a365d; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Igreja Gileade</h1>
              </div>
              <div class="content">
                <p>Olá${gestor_nome ? ` ${gestor_nome}` : ""},</p>
                ${conteudoBase}
                <p>Este é um aviso automático do sistema de gestão.</p>
              </div>
              <div class="footer">
                <p>Igreja Gileade - Sistema de Gestão</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const { error } = await resend.emails.send({
          from: "Igreja Gileade <noreply@gileadechurch.com.br>",
          to: [gestor_email],
          subject: `[Gestor] ${assunto}`,
          html: htmlGestor,
        });

        if (error) {
          console.error("Erro ao enviar email para gestor:", error);
          erros.push(`Gestor: ${error.message}`);
        } else {
          emailsEnviados.push(gestor_email);
          console.log("Email enviado para gestor:", gestor_email);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("Erro ao enviar email para gestor:", e);
        erros.push(`Gestor: ${errorMessage}`);
      }
    }

    // Email para o membro
    if (membro_email) {
      try {
        const htmlMembro = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .footer { background: #1a365d; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
              h2 { color: #1a365d; margin-top: 0; }
              strong { color: #1a365d; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Igreja Gileade</h1>
              </div>
              <div class="content">
                <p>Olá ${membro_nome},</p>
                ${tipo === "cadastro" 
                  ? `<p>Seu cadastro foi realizado com sucesso no sistema da Igreja Gileade.</p>
                     <p>Em breve você receberá mais informações sobre seu acesso.</p>`
                  : `<p>Informamos que seu cadastro foi atualizado no sistema da Igreja Gileade.</p>
                     ${campos_alterados && campos_alterados.length > 0 
                       ? `<p><strong>Campos alterados:</strong> ${campos_alterados.join(", ")}</p>` 
                       : ""}`
                }
                <p>Se você não reconhece esta ação, entre em contato com a secretaria da igreja.</p>
              </div>
              <div class="footer">
                <p>Igreja Gileade - Sistema de Gestão</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const { error } = await resend.emails.send({
          from: "Igreja Gileade <noreply@gileadechurch.com.br>",
          to: [membro_email],
          subject: assunto,
          html: htmlMembro,
        });

        if (error) {
          console.error("Erro ao enviar email para membro:", error);
          erros.push(`Membro: ${error.message}`);
        } else {
          emailsEnviados.push(membro_email);
          console.log("Email enviado para membro:", membro_email);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("Erro ao enviar email para membro:", e);
        erros.push(`Membro: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsEnviados,
        erros: erros.length > 0 ? erros : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na função notificar-cadastro-alteracao:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
