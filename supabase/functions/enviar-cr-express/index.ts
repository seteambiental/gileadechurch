import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

async function enviarMensagemZAPI(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_CLIENT_TOKEN || '',
    },
    body: JSON.stringify({ phone: phoneFormatted, message: mensagem }),
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao enviar mensagem');
  return result;
}

function formatarData(dataStr: string): string {
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarAvisos(avisos: any): string {
  if (typeof avisos === 'string') {
    try {
      const parsed = JSON.parse(avisos);
      if (typeof parsed === 'object' && parsed !== null) return formatarAvisosObj(parsed);
    } catch { /* keep as string */ }
    return avisos;
  }
  if (typeof avisos === 'object' && avisos !== null) return formatarAvisosObj(avisos);
  return '';
}

function formatarAvisosObj(obj: any): string {
  const parts: string[] = [];

  if (Array.isArray(obj.programacao_igreja) && obj.programacao_igreja.length > 0) {
    parts.push('*Programação da Igreja:*');
    obj.programacao_igreja.forEach((item: any) => {
      parts.push(`• ${item.evento}${item.data ? ` – ${formatarData(item.data)}` : ''}${item.hora ? ` às ${item.hora.substring(0, 5)}` : ''}`);
    });
  }

  if (Array.isArray(obj.proximos_eventos_agenda) && obj.proximos_eventos_agenda.length > 0) {
    parts.push('\n*Próximos Eventos:*');
    obj.proximos_eventos_agenda.forEach((item: any) => {
      parts.push(`• ${item.evento}${item.data ? ` – ${formatarData(item.data)}` : ''}${item.hora ? ` às ${item.hora.substring(0, 5)}` : ''}${item.local ? ` (${item.local})` : ''}`);
    });
  }

  if (Array.isArray(obj.lembretes_fixos) && obj.lembretes_fixos.length > 0) {
    parts.push('\n*Lembretes:*');
    obj.lembretes_fixos.forEach((item: string) => {
      parts.push(`• ${item}`);
    });
  }

  return parts.join('\n');
}

function formatarAvisosHTML(avisos: any): string {
  if (typeof avisos === 'string') {
    try {
      const parsed = JSON.parse(avisos);
      if (typeof parsed === 'object' && parsed !== null) return formatarAvisosObjHTML(parsed);
    } catch { /* keep as string */ }
    return `<p>${avisos.replace(/\n/g, '<br/>')}</p>`;
  }
  if (typeof avisos === 'object' && avisos !== null) return formatarAvisosObjHTML(avisos);
  return '';
}

function formatarAvisosObjHTML(obj: any): string {
  let html = '';

  if (Array.isArray(obj.programacao_igreja) && obj.programacao_igreja.length > 0) {
    html += '<p><strong>Programação da Igreja:</strong></p><ul>';
    obj.programacao_igreja.forEach((item: any) => {
      html += `<li>${item.evento}${item.data ? ` – ${formatarData(item.data)}` : ''}${item.hora ? ` às ${item.hora.substring(0, 5)}` : ''}</li>`;
    });
    html += '</ul>';
  }

  if (Array.isArray(obj.proximos_eventos_agenda) && obj.proximos_eventos_agenda.length > 0) {
    html += '<p><strong>Próximos Eventos:</strong></p><ul>';
    obj.proximos_eventos_agenda.forEach((item: any) => {
      html += `<li>${item.evento}${item.data ? ` – ${formatarData(item.data)}` : ''}${item.hora ? ` às ${item.hora.substring(0, 5)}` : ''}${item.local ? ` (${item.local})` : ''}</li>`;
    });
    html += '</ul>';
  }

  if (Array.isArray(obj.lembretes_fixos) && obj.lembretes_fixos.length > 0) {
    html += '<p><strong>Lembretes:</strong></p><ul>';
    obj.lembretes_fixos.forEach((item: string) => {
      html += `<li>${item}</li>`;
    });
    html += '</ul>';
  }

  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: _authUser }, error: _authErr } = await _authClient.auth.getUser();
    if (_authErr || !_authUser) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, crExpressId } = await req.json();

    if (!crExpressId) throw new Error('crExpressId é obrigatório');

    // Fetch CR Express data
    const { data: crExpress, error: crError } = await supabase
      .from('cr_express')
      .select('*')
      .eq('id', crExpressId)
      .single();

    if (crError || !crExpress) throw new Error('CR Express não encontrado');

    // Fetch all leaders, supervisors, and syndics from casas_refugio and condominios
    const { data: casas } = await supabase
      .from('casas_refugio')
      .select('lider_id, lider_esposa_id, supervisor_id, supervisor_esposa_id');

    const { data: condominios } = await supabase
      .from('condominios')
      .select('sindico_id, sindico_esposa_id');

    // Collect unique member IDs
    const memberIds = new Set<string>();
    casas?.forEach((c: any) => {
      if (c.lider_id) memberIds.add(c.lider_id);
      if (c.lider_esposa_id) memberIds.add(c.lider_esposa_id);
      if (c.supervisor_id) memberIds.add(c.supervisor_id);
      if (c.supervisor_esposa_id) memberIds.add(c.supervisor_esposa_id);
    });
    condominios?.forEach((c: any) => {
      if (c.sindico_id) memberIds.add(c.sindico_id);
      if (c.sindico_esposa_id) memberIds.add(c.sindico_esposa_id);
    });

    if (memberIds.size === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Nenhum líder encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch member contact info
    const { data: members } = await supabase
      .from('members')
      .select('id, full_name, email, whatsapp')
      .in('id', Array.from(memberIds));

    if (!members || members.length === 0) {
      throw new Error('Nenhum membro encontrado');
    }

    const dataCultoFormatada = formatarData(crExpress.data_culto);
    const avisosTexto = formatarAvisos(crExpress.avisos_importantes);
    const avisosHTML = formatarAvisosHTML(crExpress.avisos_importantes);

    // Build WhatsApp message
    const mensagemWhatsApp = `📖 *CASA REFÚGIO EXPRESS – Nro. ${crExpress.numero}*\n\n*Tema:* ${crExpress.tema}\n*Pastor/Ministrador:* ${crExpress.pastor_ministrador}\n*Texto Base:* ${crExpress.texto_base}\n*Data do Culto:* ${dataCultoFormatada}\n\n*Introdução:*\n${crExpress.introducao || ''}\n\n*Desenvolvimento:*\n${crExpress.desenvolvimento || ''}\n\n*Conclusão (prática):*\n${crExpress.conclusao || ''}\n\n✨ _Uma nova igreja, a mesma essência!_\n\n📢 *Avisos Importantes:*\n${avisosTexto}\n\n_Igreja Gileade_ 💙`;

    // Build email HTML
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background: #1a1a1a; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">CASA REFÚGIO EXPRESS – Nro. ${crExpress.numero}</h2>
        </div>
        <div style="padding: 24px; line-height: 1.6;">
          <p><strong>Tema da Ministração:</strong> ${crExpress.tema}</p>
          <p><strong>Pastor / Ministrador:</strong> ${crExpress.pastor_ministrador}</p>
          <p><strong>Texto Base:</strong> ${crExpress.texto_base}</p>
          <p><strong>Data do Culto:</strong> ${dataCultoFormatada}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <h3>Introdução:</h3>
          <p>${(crExpress.introducao || '').replace(/\n/g, '<br/>')}</p>
          <h3>Desenvolvimento:</h3>
          <p>${(crExpress.desenvolvimento || '').replace(/\n/g, '<br/>')}</p>
          <h3>Conclusão (prática):</h3>
          <p>${(crExpress.conclusao || '').replace(/\n/g, '<br/>')}</p>
          <p style="text-align: center; font-style: italic; color: #9ca3af;">Uma nova igreja, a mesma essência!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <h3>Avisos Importantes:</h3>
          ${avisosHTML}
        </div>
        <div style="background: #f9fafb; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af;">
          Igreja Gileade
        </div>
      </div>`;

    let resultados = { email: { enviados: 0, erros: 0 }, whatsapp: { enviados: 0, erros: 0 } };

    if (action === 'email' || action === 'ambos') {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      console.log('Action:', action, '| RESEND_API_KEY configurada:', !!resendKey);
      console.log('Total membros para envio:', members.length);
      if (resendKey) {
        const resend = new Resend(resendKey);
        for (const member of members) {
          if (!member.email) {
            console.log(`Membro ${member.full_name} sem email, pulando`);
            continue;
          }
          try {
            console.log(`Enviando email para: ${member.full_name} (${member.email})`);
            const sendResult = await resend.emails.send({
              from: 'Igreja Gileade <onboarding@resend.dev>',
              to: [member.email],
              subject: `Casa Refúgio Express Nro. ${crExpress.numero} – ${crExpress.tema}`,
              html: emailHTML,
            });
            console.log(`Email enviado para ${member.email}:`, JSON.stringify(sendResult));
            resultados.email.enviados++;
            // Delay de 600ms para respeitar limite de 2 req/s do Resend
            await new Promise(resolve => setTimeout(resolve, 600));
          } catch (err: any) {
            console.error(`Erro email para ${member.full_name} (${member.email}):`, err?.message || err);
            resultados.email.erros++;
          }
        }
      } else {
        console.error('RESEND_API_KEY não configurada');
      }
    }

    if (action === 'whatsapp' || action === 'ambos') {
      for (const member of members) {
        if (!member.whatsapp) continue;
        try {
          await enviarMensagemZAPI(member.whatsapp, mensagemWhatsApp);
          resultados.whatsapp.enviados++;
          // Delay de 30 segundos entre envios WhatsApp para evitar spam
          await new Promise(resolve => setTimeout(resolve, 30000));
        } catch (err) {
          console.error(`Erro WhatsApp para ${member.full_name}:`, err);
          resultados.whatsapp.erros++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
