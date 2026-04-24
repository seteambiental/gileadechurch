import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const rawEvolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_URL = rawEvolutionUrl.startsWith("http")
  ? rawEvolutionUrl
  : `https://${rawEvolutionUrl}`;
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

// Quantos itens processar por execução (cron a cada minuto).
// Com pausa 5–15s entre envios, ~6 itens em 60s é seguro.
const BATCH_SIZE = 6;

function randomBulkDelayMs() {
  return Math.floor(Math.random() * 10_000) + 5_000; // 5–14.9s
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function enviarTextoEvolution(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY || "" },
    body: JSON.stringify({
      number: `${phoneFormatted}@s.whatsapp.net`,
      text: mensagem,
    }),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(result?.message || result?.error || `HTTP ${resp.status}`);
  }
  return result;
}

async function enviarImagemEvolution(telefone: string, imageUrl: string, caption?: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55") ? phoneClean : `55${phoneClean}`;
  const url = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY || "" },
    body: JSON.stringify({
      number: `${phoneFormatted}@s.whatsapp.net`,
      mediatype: "image",
      media: imageUrl,
      caption: caption || "",
    }),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(result?.message || result?.error || `HTTP ${resp.status}`);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      return new Response(
        JSON.stringify({ success: false, error: "Evolution API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Selecionar itens prontos para envio
    const agora = new Date().toISOString();
    const { data: itens, error: selError } = await supabase
      .from("comunicacao_fila")
      .select("*")
      .eq("status", "pendente")
      .lte("proxima_tentativa_em", agora)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (selError) throw selError;

    if (!itens || itens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processados: 0, message: "Nada a processar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Reservar (marcar como processando) atomicamente um a um
    const reservados: typeof itens = [];
    for (const item of itens) {
      const { data: upd, error: updErr } = await supabase
        .from("comunicacao_fila")
        .update({ status: "processando" })
        .eq("id", item.id)
        .eq("status", "pendente")
        .select("id")
        .maybeSingle();
      if (!updErr && upd) reservados.push(item);
    }

    let enviados = 0;
    let erros = 0;
    let descartados = 0;

    for (let i = 0; i < reservados.length; i++) {
      const item = reservados[i];
      const tentativaAtual = (item.tentativas || 0) + 1;

      try {
        if (item.midia_url) {
          await enviarImagemEvolution(item.destinatario_telefone, item.midia_url, item.conteudo);
        } else {
          await enviarTextoEvolution(item.destinatario_telefone, item.conteudo);
        }

        // Sucesso: marca enviado e registra em comunicacao_envios
        await supabase
          .from("comunicacao_fila")
          .update({
            status: "enviado",
            tentativas: tentativaAtual,
            enviado_em: new Date().toISOString(),
            ultimo_erro: null,
          })
          .eq("id", item.id);

        await supabase.from("comunicacao_envios").insert({
          tipo: item.tipo,
          segmento: item.segmento,
          destinatario_telefone: item.destinatario_telefone,
          destinatario_nome: item.destinatario_nome,
          destinatario_member_id: item.destinatario_member_id,
          conteudo: item.conteudo,
          midia_url: item.midia_url,
          evento_id: item.evento_id,
          iniciado_por: item.iniciado_por,
          status: "enviado",
          fila_id: item.id,
          tentativas: tentativaAtual,
        });
        enviados++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        const maxT = item.max_tentativas || 3;
        if (tentativaAtual >= maxT) {
          // Estourou tentativas → descartado e registra falha definitiva no log
          await supabase
            .from("comunicacao_fila")
            .update({
              status: "descartado",
              tentativas: tentativaAtual,
              ultimo_erro: msg,
            })
            .eq("id", item.id);

          await supabase.from("comunicacao_envios").insert({
            tipo: item.tipo,
            segmento: item.segmento,
            destinatario_telefone: item.destinatario_telefone,
            destinatario_nome: item.destinatario_nome,
            destinatario_member_id: item.destinatario_member_id,
            conteudo: item.conteudo,
            midia_url: item.midia_url,
            evento_id: item.evento_id,
            iniciado_por: item.iniciado_por,
            status: "erro",
            erro_mensagem: msg,
            fila_id: item.id,
            tentativas: tentativaAtual,
          });
          descartados++;
        } else {
          // Reagenda com backoff exponencial: 1min, 5min, 15min...
          const backoffMin = Math.pow(5, tentativaAtual - 1); // 1, 5, 25...
          const proximaTentativa = new Date(Date.now() + backoffMin * 60_000).toISOString();
          await supabase
            .from("comunicacao_fila")
            .update({
              status: "pendente",
              tentativas: tentativaAtual,
              proxima_tentativa_em: proximaTentativa,
              ultimo_erro: msg,
            })
            .eq("id", item.id);
          erros++;
        }
      }

      // Espaçamento 5–15s entre envios (não no último)
      if (i < reservados.length - 1) {
        await sleep(randomBulkDelayMs());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processados: reservados.length,
        enviados,
        erros_reagendados: erros,
        descartados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("processar-fila-whatsapp erro:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});