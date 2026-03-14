import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

function gerarHtmlEmail(nome: string) {
  const primeiroNome = nome.split(' ')[0];
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1e40af; font-size: 22px; margin: 0;">🔐 Atualização de Senha</h1>
    </div>
    
    <p style="font-size: 16px; color: #333;">Olá, <strong>${primeiroNome}</strong>!</p>
    
    <p style="font-size: 15px; color: #333; line-height: 1.6;">
      Informamos que houve uma atualização no padrão de senha do nosso sistema. 
      Sua nova senha foi redefinida automaticamente seguindo o novo formato:
    </p>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #1e40af; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="font-size: 15px; color: #1e40af; margin: 0 0 8px 0; font-weight: bold;">📋 Novo formato da senha:</p>
      <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.8;">
        <strong>Primeira letra do nome</strong> (maiúscula) + <strong>primeira letra do sobrenome</strong> (minúscula) + <strong>6 primeiros dígitos do CPF</strong>
      </p>
      <p style="font-size: 14px; color: #666; margin: 8px 0 0 0; font-style: italic;">
        Exemplo: Alessandro Costa, CPF 030.073... → <strong>Ac030073</strong>
      </p>
    </div>
    
    <div style="background-color: #fef3c7; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
      <p style="font-size: 14px; color: #92400e; margin: 0;">
        ⚠️ <strong>Importante:</strong> Recomendamos que você altere sua senha no primeiro acesso para uma senha pessoal e segura.
      </p>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://gileadechurch.lovable.app/auth" 
         style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
        Acessar o Sistema
      </a>
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #1e40af; font-weight: bold; margin: 0;">Igreja Gileade 💙</p>
      <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">Um lugar de cura e restauração</p>
    </div>
  </div>
</body>
</html>`;
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
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: hasAccess } = await authClient.rpc('has_full_access');
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Proibido' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { offset = 0, batch_size = 20 } = await req.json().catch(() => ({}));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Buscar membros com email
    const { data: members, count } = await supabaseAdmin
      .from("members")
      .select("id, full_name, email", { count: "exact" })
      .not("email", "is", null)
      .neq("email", "")
      .not("user_id", "is", null)
      .order("full_name")
      .range(offset, offset + batch_size - 1);

    const resend = new Resend(RESEND_API_KEY);
    let sent = 0, errors: any[] = [];

    for (const member of (members || [])) {
      const m = member as any;
      try {
        await resend.emails.send({
          from: "Igreja Gileade <onboarding@resend.dev>",
          to: [m.email],
          subject: "🔐 Atualização de Senha - Igreja Gileade",
          html: gerarHtmlEmail(m.full_name || "Membro"),
        });
        sent++;
        // Delay entre envios para respeitar rate limits
        await new Promise(r => setTimeout(r, 600));
      } catch (err: any) {
        errors.push({ email: m.email, error: err.message || String(err) });
      }
    }

    const hasMore = (offset + batch_size) < (count || 0);

    return new Response(JSON.stringify({
      total: count,
      offset,
      batch_size,
      sent,
      errors_count: errors.length,
      errors,
      has_more: hasMore,
      next_offset: hasMore ? offset + batch_size : null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
