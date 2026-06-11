import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const WEBHOOK_SECRET = Deno.env.get("WASENDER_WEBHOOK_SECRET") || "";

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
    // (cliente disponível para registrar/dar baixa em mensagens, se necessário)
    void supabase;

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
            msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.text ||
            "[mídia]";
          console.log(`Mensagem recebida de ${remetente}: ${texto}`);
        }
        break;
      }

      case "message.sent":
      case "messages.update": {
        const status = data?.status ?? data?.update?.status;
        console.log(`Status de mensagem atualizado: ${status}`);
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
