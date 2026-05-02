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

// Padrões caso a tabela whatsapp_config esteja indisponível
const DEFAULTS = {
  batch_size: 6,
  delay_min_seconds: 5,
  delay_max_seconds: 15,
  max_tentativas: 3,
  backoff_base_minutes: 1,
  backoff_factor: 5,
};

type FilaCfg = typeof DEFAULTS;

function randomDelayMs(cfg: FilaCfg) {
  const min = Math.max(1, cfg.delay_min_seconds) * 1000;
  const max = Math.max(min, cfg.delay_max_seconds * 1000);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function backoffMinutes(cfg: FilaCfg, tentativaAtual: number) {
  // tentativaAtual é a tentativa que acabou de falhar (1, 2, 3...)
  // base * factor^(tentativaAtual - 1)
  const base = Math.max(1, cfg.backoff_base_minutes);
  const factor = Math.max(1, cfg.backoff_factor);
  return base * Math.pow(factor, tentativaAtual - 1);
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
      number: phoneFormatted,
      text: mensagem,
    }),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detail = typeof result === 'object' ? JSON.stringify(result).slice(0, 500) : String(result);
    throw new Error(result?.message || result?.error || `HTTP ${resp.status}: ${detail}`);
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
      number: phoneFormatted,
      mediatype: "image",
      media: imageUrl,
      caption: caption || "",
    }),
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detail = typeof result === 'object' ? JSON.stringify(result).slice(0, 500) : String(result);
    throw new Error(result?.message || result?.error || `HTTP ${resp.status}: ${detail}`);
  }
  return result;
}

async function enviarImagemComFallbackTexto(telefone: string, imageUrl: string, caption: string) {
  try {
    return await enviarImagemEvolution(telefone, imageUrl, caption);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Falha ao enviar imagem; tentando texto. Motivo: ${msg}`);
    return await enviarTextoEvolution(telefone, caption);
  }
}

function primeiroNomeDe(nome?: string | null) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}

function preencherTemplate(template: string, vars: { nome?: string | null; evento?: string | null }) {
  const nomeCompleto = (vars.nome || "").trim();
  const primeiroNome = primeiroNomeDe(nomeCompleto);
  const valores: Record<string, string> = {
    NOME_COMPLETO: nomeCompleto,
    NOME: primeiroNome || nomeCompleto,
    EVENTO: vars.evento || "o evento",
  };

  return Object.entries(valores).reduce((texto, [chave, valor]) => {
    return texto.replace(new RegExp(`\\{\\s*${chave}\\s*\\}`, "gi"), valor);
  }, template);
}

async function buscarTituloEvento(supabase: any, eventoId?: string | null) {
  if (!eventoId) return null;
  for (const tabela of ["agenda_igreja", "impacto_eventos"]) {
    const { data, error } = await supabase
      .from(tabela)
      .select("titulo")
      .eq("id", eventoId)
      .maybeSingle();
    if (!error && data?.titulo) return data.titulo as string;
  }
  return null;
}

async function prepararConteudoFila(supabase: any, item: any) {
  const conteudo = String(item.conteudo || "");
  if (!/\{\s*(NOME|NOME_COMPLETO|EVENTO)\s*\}/i.test(conteudo)) return conteudo;
  const tituloEvento = await buscarTituloEvento(supabase, item.evento_id);
  return preencherTemplate(conteudo, {
    nome: item.destinatario_nome,
    evento: tituloEvento,
  });
}

Deno.serve(async (req) => {
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

    // 0) Carregar configuração dinâmica da fila
    const { data: cfgRow } = await supabase
      .from("whatsapp_config")
      .select(
        "batch_size, delay_min_seconds, delay_max_seconds, max_tentativas, backoff_base_minutes, backoff_factor",
      )
      .eq("id", true)
      .maybeSingle();

    const cfg: FilaCfg = {
      batch_size: cfgRow?.batch_size ?? DEFAULTS.batch_size,
      delay_min_seconds: cfgRow?.delay_min_seconds ?? DEFAULTS.delay_min_seconds,
      delay_max_seconds: cfgRow?.delay_max_seconds ?? DEFAULTS.delay_max_seconds,
      max_tentativas: cfgRow?.max_tentativas ?? DEFAULTS.max_tentativas,
      backoff_base_minutes:
        cfgRow?.backoff_base_minutes ?? DEFAULTS.backoff_base_minutes,
      backoff_factor: Number(cfgRow?.backoff_factor ?? DEFAULTS.backoff_factor),
    };

    // 1) Selecionar itens prontos para envio
    const agora = new Date().toISOString();
    const { data: itens, error: selError } = await supabase
      .from("comunicacao_fila")
      .select("*")
      .eq("status", "pendente")
      .lte("proxima_tentativa_em", agora)
      .order("created_at", { ascending: true })
      .limit(cfg.batch_size);

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
        const conteudoFinal = await prepararConteudoFila(supabase, item);
        if (item.midia_url) {
          await enviarImagemComFallbackTexto(item.destinatario_telefone, item.midia_url, conteudoFinal);
        } else {
          await enviarTextoEvolution(item.destinatario_telefone, conteudoFinal);
        }

        // Sucesso: marca enviado e registra em comunicacao_envios
        await supabase
          .from("comunicacao_fila")
          .update({
            status: "enviado",
            tentativas: tentativaAtual,
            enviado_em: new Date().toISOString(),
            ultimo_erro: null,
            conteudo: conteudoFinal,
          })
          .eq("id", item.id);

        await supabase.from("comunicacao_envios").insert({
          tipo: item.tipo,
          segmento: item.segmento,
          destinatario_telefone: item.destinatario_telefone,
          destinatario_nome: item.destinatario_nome,
          destinatario_member_id: item.destinatario_member_id,
          conteudo: conteudoFinal,
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
        // max_tentativas pode estar fixado por item; cfg é o padrão atual
        const maxT = item.max_tentativas || cfg.max_tentativas;
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
          // Backoff dinâmico: base * factor^(n-1)
          const backoffMin = backoffMinutes(cfg, tentativaAtual);
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

      // Espaçamento configurável entre envios (não no último)
      if (i < reservados.length - 1) {
        await sleep(randomDelayMs(cfg));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processados: reservados.length,
        enviados,
        erros_reagendados: erros,
        descartados,
        config: cfg,
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