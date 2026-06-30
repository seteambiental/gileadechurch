import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  consultarMensagemWasender,
  enviarTextoWhatsApp,
  enviarMidiaWhatsApp,
  normalizarWasenderEnvio,
  statusEntregaPorCodigo,
  statusEntregaPorTexto,
  whatsappConfigurado,
  verificarConexaoWhatsApp,
} from "../_shared/whatsapp-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Padrões caso a tabela whatsapp_config esteja indisponível
const DEFAULTS = {
  batch_size: 1,
  delay_min_seconds: 15,
  delay_max_seconds: 30,
  max_tentativas: 3,
  backoff_base_minutes: 1,
  backoff_factor: 5,
};

// Rodapé de pedido de confirmação de recebimento, adicionado a cada mensagem
// quando o recurso está ligado em whatsapp_config.pedir_confirmacao.
const RODAPE_CONFIRMACAO =
  "\n\n———\n🙏 Pode confirmar o recebimento desta mensagem? Responda *OK* ou 👍";

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
  return await enviarTextoWhatsApp(telefone, mensagem);
}

async function enviarMidiaComFallbackTexto(
  telefone: string,
  midiaUrl: string,
  caption: string,
  fileName?: string,
) {
  try {
    return await enviarMidiaWhatsApp(telefone, midiaUrl, caption || "", undefined, fileName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Falha ao enviar mídia; tentando texto. Motivo: ${msg}`);
    return await enviarTextoWhatsApp(telefone, caption);
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

// Garantia final: nenhum placeholder crítico pode escapar para o WhatsApp.
// Se {NOME}/{NOME_COMPLETO}/{EVENTO} continuarem após o preenchimento, lança erro
// para que o item caia em retry/descartado em vez de ser enviado "vazio".
const PLACEHOLDERS_CRITICOS = ["NOME", "NOME_COMPLETO", "EVENTO"];
export function validarPlaceholdersResolvidos(texto: string) {
  const restantes = PLACEHOLDERS_CRITICOS.filter((chave) =>
    new RegExp(`\\{\\s*${chave}\\s*\\}`, "i").test(texto)
  );
  if (restantes.length > 0) {
    throw new Error(
      `Placeholders não substituídos: ${restantes.map((c) => `{${c}}`).join(", ")}`,
    );
  }
}
export { preencherTemplate, prepararConteudoFila };

async function atualizarStatusMensagensRecentes(supabase: any) {
  const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pendentes, error } = await supabase
    .from("comunicacao_envios")
    .select("id, fila_id, provider_message_id, provider_response")
    .not("provider_message_id", "is", null)
    .in("status", ["aceito_provedor", "enviado"])
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.warn("Falha ao buscar mensagens para atualizar status:", error.message);
    return { consultadas: 0, atualizadas: 0 };
  }

  let atualizadas = 0;
  for (const envio of pendentes || []) {
    try {
      const possiveisIds = Array.from(new Set([
        envio.provider_message_id,
        envio.provider_response?.data?.msgId,
        envio.provider_response?.data?.messageId,
        envio.provider_response?.data?.id,
        envio.provider_response?.data?.key?.id,
        envio.provider_response?.data?.result?.key?.id,
        envio.provider_response?.result?.key?.id,
      ]
        .filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
        .map((id) => String(id))))
        .sort((a, b) => Number(/^\d+$/.test(b)) - Number(/^\d+$/.test(a)));

      let recibo = null;
      const falhas: string[] = [];
      for (const idConsulta of possiveisIds) {
        try {
          recibo = await consultarMensagemWasender(idConsulta);
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          falhas.push(`${idConsulta}: ${msg}`);
        }
      }

      if (!recibo) {
        throw new Error(falhas.join(" | ") || "Nenhum ID de mensagem disponível para consulta");
      }

      const mapped = recibo.providerStatusCode !== null
        ? statusEntregaPorCodigo(recibo.providerStatusCode)
        : statusEntregaPorTexto(recibo.providerStatus);
      const patch: Record<string, unknown> = {
        status: mapped.status,
        provider_status: mapped.providerStatus ?? recibo.providerStatus,
        provider_status_code: recibo.providerStatusCode,
        provider_response: recibo.raw,
      };
      if (mapped.status === "entregue") patch.entregue_em = new Date().toISOString();
      if (mapped.status === "lido") {
        patch.entregue_em = new Date().toISOString();
        patch.lido_em = new Date().toISOString();
      }
      if (mapped.status === "erro") patch.erro_mensagem = "Provedor informou falha na entrega";

      await supabase.from("comunicacao_envios").update(patch).eq("id", envio.id);
      if (envio.fila_id && ["entregue", "lido", "erro"].includes(mapped.status)) {
        await supabase.from("comunicacao_fila").update({ status: mapped.status }).eq("id", envio.fila_id);
      }
      atualizadas++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Falha ao consultar status Wasender msg ${envio.provider_message_id}: ${msg}`);
    }
  }

  return { consultadas: pendentes?.length || 0, atualizadas };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (!whatsappConfigurado()) {
    return new Response(
      JSON.stringify({ success: false, error: "WhatsApp (WasenderAPI) não configurado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Processamento real da fila. Pode levar dezenas de segundos por causa das
  // consultas de status e do espaçamento entre envios, então rodamos em
  // segundo plano e respondemos imediatamente para o cliente não dar timeout
  // ("Failed to fetch").
  // Trabalho pesado em segundo plano.
  const trabalho = (async () => {
    const statusSync = await atualizarStatusMensagensRecentes(supabase);

    // Verifica se a sessão está conectada ANTES de processar a fila.
    // Se estiver caída, aborta sem consumir tentativas dos itens (eles permanecem pendentes).
    const conexao = await verificarConexaoWhatsApp();
    if (!conexao.conectado) {
      console.warn(`Fila não processada: WhatsApp desconectado (estado=${conexao.estado})`);
      return;
    }

    // 0) Carregar configuração dinâmica da fila
    const { data: cfgRow } = await supabase
      .from("whatsapp_config")
      .select(
        "batch_size, delay_min_seconds, delay_max_seconds, max_tentativas, backoff_base_minutes, backoff_factor, pedir_confirmacao",
      )
      .eq("id", true)
      .maybeSingle();

    const pedirConfirmacao = cfgRow?.pedir_confirmacao ?? true;

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
      console.log("Nada a processar", statusSync);
      return;
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
        validarPlaceholdersResolvidos(conteudoFinal);
        const conteudoOriginal = String(item.conteudo || "");
        // Acrescenta o pedido de confirmação de recebimento (quando ligado).
        const conteudoEnvio = pedirConfirmacao
          ? conteudoFinal + RODAPE_CONFIRMACAO
          : conteudoFinal;
        const houveSubstituicao = conteudoOriginal !== conteudoFinal;
        console.log(
          `[fila ${item.id}] tipo=${item.tipo} para=${item.destinatario_telefone} (${item.destinatario_nome || "sem nome"})\n` +
          `  evento_id=${item.evento_id || "—"} midia=${item.midia_url ? "sim" : "não"} tentativa=${tentativaAtual}\n` +
          `  ORIGINAL (${conteudoOriginal.length} chars): ${JSON.stringify(conteudoOriginal).slice(0, 600)}\n` +
          `  FINAL    (${conteudoFinal.length} chars): ${JSON.stringify(conteudoFinal).slice(0, 600)}\n` +
          `  substituiu_placeholders=${houveSubstituicao}`
        );
        const envioResult = item.midia_url
          ? await enviarMidiaComFallbackTexto(item.destinatario_telefone, item.midia_url, conteudoEnvio)
          : await enviarTextoEvolution(item.destinatario_telefone, conteudoEnvio);
        const recibo = normalizarWasenderEnvio(envioResult);

        // Sucesso aqui significa apenas que o provedor aceitou a mensagem.
        // Entrega/leitura real será atualizada por webhook ou consulta posterior.
        await supabase
          .from("comunicacao_fila")
          .update({
            status: "aceito_provedor",
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
          conteudo: conteudoEnvio,
          midia_url: item.midia_url,
          evento_id: item.evento_id,
          iniciado_por: item.iniciado_por,
          status: "aceito_provedor",
          fila_id: item.id,
          tentativas: tentativaAtual,
          confirmacao_solicitada: pedirConfirmacao,
          provider_message_id: recibo.msgId,
          provider_status: recibo.providerStatus,
          provider_status_code: recibo.providerStatusCode,
          provider_response: recibo.raw,
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

    console.log(
      `Fila processada: processados=${reservados.length} enviados=${enviados} reagendados=${erros} descartados=${descartados}`,
    );
  })().catch((error) => {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("processar-fila-whatsapp erro:", msg);
  });

  // @ts-ignore EdgeRuntime existe no runtime do Supabase
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(trabalho);
  }

  return new Response(
    JSON.stringify({ success: true, iniciado: true, message: "Processamento iniciado em segundo plano" }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});