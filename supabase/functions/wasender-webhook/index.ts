import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  statusEntregaPorCodigo,
  statusEntregaPorTexto,
} from "../_shared/whatsapp-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const WEBHOOK_SECRET = Deno.env.get("WASENDER_WEBHOOK_SECRET") || "";

function extrairMessageId(data: any) {
  const msg = data?.messages ?? data?.message ?? data;
  const raw =
    data?.msgId ??
    data?.messageId ??
    data?.id ??
    data?.key?.id ??
    data?.update?.key?.id ??
    data?.data?.key?.id ??
    data?.result?.msgId ??
    data?.result?.messageId ??
    data?.result?.id ??
    data?.result?.key?.id ??
    msg?.msgId ??
    msg?.messageId ??
    msg?.id ??
    msg?.key?.id ??
    msg?.message?.key?.id ??
    "";
  return raw === null || raw === undefined ? "" : String(raw);
}

async function buscarEnviosPorMessageId(supabase: any, messageId: string) {
  const { data: porProvider, error: providerErr } = await supabase
    .from("comunicacao_envios")
    .select("id, fila_id")
    .eq("provider_message_id", messageId);

  if (providerErr) {
    console.warn("Falha ao buscar envio pelo provider_message_id:", providerErr.message);
    return [];
  }

  if (porProvider && porProvider.length > 0) return porProvider;

  const { data: porChave, error: chaveErr } = await supabase
    .from("comunicacao_envios")
    .select("id, fila_id")
    .or(`provider_response->data->key->>id.eq.${messageId},provider_response->data->result->key->>id.eq.${messageId},provider_response->result->key->>id.eq.${messageId}`);

  if (chaveErr) {
    console.warn("Falha ao buscar envio pelo id interno da mensagem:", chaveErr.message);
    return [];
  }

  return porChave || [];
}

async function atualizarEntrega(supabase: any, data: any) {
  const statusRaw =
    data?.success === false ? "failed" :
    data?.status ??
    data?.update?.status ??
    data?.data?.status ??
    data?.result?.status ??
    data?.result?.ack ??
    data?.result?.message?.status ??
    "";
  // IMPORTANTE: só tratar como código numérico quando realmente houver um número.
  // Antes, um status vazio ("") era convertido por Number("") => 0, e o código 0
  // está mapeado como "failed", marcando entregas válidas como erro.
  const statusStr = typeof statusRaw === "string" ? statusRaw.trim() : statusRaw;
  const statusCode =
    typeof statusStr === "number" && Number.isFinite(statusStr)
      ? statusStr
      : typeof statusStr === "string" && /^\d+$/.test(statusStr)
        ? Number(statusStr)
        : null;
  const mapped = statusCode !== null
    ? statusEntregaPorCodigo(statusCode)
    : statusEntregaPorTexto(String(statusStr || ""));
  const messageId = extrairMessageId(data);

  console.log(`Status de mensagem atualizado: ${mapped.providerStatus || statusStr || "unknown"} (msg ${messageId})`);

  if (!messageId) return;

  // Não rebaixar um status já avançado: se a mensagem já está entregue/lida,
  // ignorar atualizações neutras (aceito_provedor) que possam chegar fora de ordem.
  if (mapped.status === "aceito_provedor") {
    const { data: atual } = await supabase
      .from("comunicacao_envios")
      .select("status")
      .or(`provider_message_id.eq.${messageId},provider_response->data->key->>id.eq.${messageId},provider_response->data->result->key->>id.eq.${messageId},provider_response->result->key->>id.eq.${messageId}`)
      .limit(1);
    if (atual?.[0] && ["entregue", "lido"].includes(atual[0].status)) return;
  }

  const patch: Record<string, unknown> = {
    status: mapped.status,
    provider_status: mapped.providerStatus || String(statusRaw || ""),
    provider_status_code: statusCode,
  };
  const agora = new Date().toISOString();
  if (mapped.status === "entregue") patch.entregue_em = agora;
  if (mapped.status === "lido") {
    patch.entregue_em = agora;
    patch.lido_em = agora;
  }
  if (mapped.status === "erro") patch.erro_mensagem = "Provedor informou falha na entrega";

  const envios = await buscarEnviosPorMessageId(supabase, messageId);
  if (envios.length === 0) {
    console.warn(`Nenhum envio encontrado para mensagem ${messageId}`);
    return;
  }

  const ids = envios.map((envio: any) => envio.id);
  const { error: updErr } = await supabase
    .from("comunicacao_envios")
    .update(patch)
    .in("id", ids);

  if (updErr) {
    console.warn("Falha ao atualizar status em comunicacao_envios:", updErr.message);
    return;
  }

  for (const envio of envios) {
    if (envio.fila_id && ["entregue", "lido", "erro"].includes(mapped.status)) {
      await supabase.from("comunicacao_fila").update({ status: mapped.status }).eq("id", envio.fila_id);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verifica a assinatura do webhook (quando um segredo estiver configurado).
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get("x-webhook-signature") || "";
      if (signature !== WEBHOOK_SECRET) {
        console.warn("Assinatura do webhook inválida");
        return new Response(
          JSON.stringify({ success: false, error: "Assinatura inválida" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    console.log("Webhook WasenderAPI recebido:", JSON.stringify(body).substring(0, 500));

    // O WasenderAPI envia o nome do evento em "event" e os dados em "data".
    const evento: string = body.event || body.type || "desconhecido";
    const data: any = body.data ?? body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    switch (evento) {
      case "messages.received":
      case "message.received":
      case "messages.upsert": {
        const msg = data?.messages ?? data;
        const fromMe = msg?.key?.fromMe ?? msg?.fromMe ?? false;
        if (fromMe === false) {
          const remetente =
            (msg?.key?.remoteJid || msg?.from || "")
              .toString()
              .replace("@s.whatsapp.net", "");
          const texto =
            msg?.messageBody ||
            msg?.body ||
            msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.text ||
            "[mídia]";
          console.log(`Mensagem recebida de ${remetente}: ${texto}`);

          // Tenta casar a resposta com o último envio que pediu confirmação
          // de recebimento e ainda não foi confirmado (janela de 7 dias).
          const digitos = remetente.replace(/\D/g, "");
          // remove código do país (55) para casar com o formato armazenado (DDD+numero)
          const semPais = digitos.startsWith("55") ? digitos.slice(2) : digitos;
          const ultimos8 = semPais.slice(-8);
          if (ultimos8.length === 8) {
            const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: candidatos, error: selErr } = await supabase
              .from("comunicacao_envios")
              .select("id, destinatario_telefone, created_at")
              .eq("confirmacao_solicitada", true)
              .is("confirmado_em", null)
              .ilike("destinatario_telefone", `%${ultimos8}`)
              .gte("created_at", seteDiasAtras)
              .order("created_at", { ascending: false })
              .limit(1);

            if (selErr) {
              console.warn("Erro ao buscar envio para confirmar:", selErr.message);
            } else if (candidatos && candidatos.length > 0) {
              const alvo = candidatos[0];
              const { error: updErr } = await supabase
                .from("comunicacao_envios")
                .update({
                  confirmado_em: new Date().toISOString(),
                  confirmacao_resposta: String(texto).slice(0, 500),
                })
                .eq("id", alvo.id);
              if (updErr) {
                console.warn("Falha ao marcar confirmação de recebimento:", updErr.message);
              } else {
                console.log(`Confirmação de recebimento registrada para envio ${alvo.id}`);
              }
            } else {
              console.log(`Nenhum envio pendente de confirmação para ${ultimos8}`);
            }
          }
        }
        break;
      }

      case "message.sent":
      case "message.delivered":
      case "message.read":
      case "message.failed":
      case "messages.sent":
      case "messages.delivered":
      case "messages.read":
      case "messages.failed":
      case "messages.update": {
        await atualizarEntrega(supabase, data);

        // Se o provedor avisar que a mensagem falhou, marca o aniversário como erro.
        const status = String(data?.status ?? data?.update?.status ?? "").toLowerCase();
        const messageId = extrairMessageId(data);
        const falhou = ["failed", "error", "undelivered", "not_delivered", "0"].includes(status);
        const entregue = ["delivered", "read", "3", "4", "5"].includes(status);
        if (messageId && (falhou || entregue)) {
          const { error: updErr } = await supabase
            .from("aniversarios_enviados")
            .update({
              sucesso: !falhou,
              erro_mensagem: falhou ? `Provedor informou status: ${status}` : null,
            })
            .eq("message_id", messageId);
          if (updErr) {
            console.warn("Falha ao atualizar status do aniversário:", updErr.message);
          }
        }
        break;
      }

      case "session.status":
      case "connection.update": {
        const status = data?.status ?? data?.state;
        console.log(`Status da sessão: ${status}`);
        break;
      }

      default:
        console.log(`Evento não tratado: ${evento}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro webhook WasenderAPI:", errorMessage);
    // Respondemos 200 para o provedor não reenviar em loop por erro nosso de processamento.
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
