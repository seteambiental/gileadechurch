import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const rawEvolutionUrl = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_URL = rawEvolutionUrl.startsWith("http")
  ? rawEvolutionUrl
  : `https://${rawEvolutionUrl}`;
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
const EVOLUTION_INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME");

function primeiroNomeDe(nome?: string | null) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}

function preencherTemplate(
  template: string,
  vars: {
    nomeCompleto?: string | null;
    nomeEmergencia?: string | null;
    evento?: string | null;
    data?: string | null;
  },
) {
  const nomeCompleto = (vars.nomeCompleto || "").trim();
  const valores: Record<string, string> = {
    NOME_COMPLETO: nomeCompleto,
    NOME: primeiroNomeDe(nomeCompleto) || nomeCompleto,
    NOME_EMERGENCIA: (vars.nomeEmergencia || "").trim() || "responsável",
    EVENTO: vars.evento || "o evento",
    DATA_EVENTO: vars.data || "",
    DATA: vars.data || "",
  };
  return Object.entries(valores).reduce((texto, [chave, valor]) => {
    return texto.replace(new RegExp(`\\{\\s*${chave}\\s*\\}`, "gi"), valor);
  }, template);
}

function formatarDataPt(data?: string | null) {
  if (!data) return "";
  try {
    return new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return data;
  }
}

async function enviarTexto(telefone: string, mensagem: string) {
  const phoneClean = telefone.replace(/\D/g, "");
  const phoneFormatted = phoneClean.startsWith("55")
    ? phoneClean
    : `55${phoneClean}`;
  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY || "",
    },
    body: JSON.stringify({ number: phoneFormatted, text: mensagem }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(
      result.message || result.error || `Falha (${response.status})`,
    );
  }
  return result;
}

async function buscarEvento(supabase: any, eventoId: string, eventoTipo: string) {
  const tabela = eventoTipo === "impacto" ? "impacto_eventos" : "agenda_igreja";
  const campoData = eventoTipo === "impacto" ? "data_inicio" : "data_evento";
  const campoFim = eventoTipo === "impacto" ? "data_fim" : "data_fim";
  const { data } = await supabase
    .from(tabela)
    .select(`id, titulo, ${campoData}, ${campoFim}`)
    .eq("id", eventoId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    titulo: data.titulo as string,
    data_inicio: (data as any)[campoData] as string,
    data_fim: ((data as any)[campoFim] as string) || (data as any)[campoData],
  };
}

function eventoEncerrado(evento: { data_inicio: string; data_fim?: string | null }) {
  const ref = evento.data_fim || evento.data_inicio;
  if (!ref) return false;
  const fim = new Date(ref + "T23:59:59");
  return fim.getTime() < Date.now();
}

async function buscarInscricoes(
  supabase: any,
  eventoId: string,
  inscricaoId?: string | null,
) {
  let q = supabase
    .from("impacto_inscricoes")
    .select(
      "id, nome, telefone, telefone_emergencia, telefone_responsavel, nome_responsavel, status_pagamento, aprovado",
    )
    .eq("evento_id", eventoId);
  if (inscricaoId) q = q.eq("id", inscricaoId);
  else q = q.neq("status_pagamento", "cancelado");
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function delayBulk() {
  // 15-30 s aleatório (anti-SPAM)
  const ms = Math.floor(Math.random() * 15_000) + 15_000;
  return new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const tipo = body.tipo as "inicial" | "manual";
    const eventoId = body.eventoId as string;
    const eventoTipo = (body.eventoTipo as string) || "impacto";
    const inscricaoId = (body.inscricaoId as string) || null;
    const mensagemOverride = (body.mensagemOverride as string) || null;
    const destinatarioTipo =
      (body.destinatarioTipo as "principal" | "emergencia") || "emergencia";

    if (!eventoId || !tipo) {
      return new Response(
        JSON.stringify({ error: "Faltam parâmetros obrigatórios" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const evento = await buscarEvento(supabase, eventoId, eventoTipo);
    if (!evento) throw new Error("Evento não encontrado");
    if (eventoEncerrado(evento)) {
      return new Response(
        JSON.stringify({ error: "Evento já encerrado — envios bloqueados" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Config (mensagem padrão)
    const { data: cfg } = await supabase
      .from("evento_emergencia_config")
      .select("*")
      .eq("evento_id", eventoId)
      .eq("evento_tipo", eventoTipo)
      .maybeSingle();

    const mensagemBase =
      mensagemOverride?.trim() ||
      (tipo === "inicial" ? cfg?.mensagem_inicial : cfg?.mensagem_inicial) ||
      "";

    if (!mensagemBase.trim()) {
      return new Response(
        JSON.stringify({
          error:
            "Nenhuma mensagem configurada. Configure em Configurações → Contato de Emergência.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const inscricoes = await buscarInscricoes(supabase, eventoId, inscricaoId);
    const dataEventoFmt = formatarDataPt(evento.data_inicio);
    let enviados = 0;
    let falhas = 0;
    const erros: string[] = [];

    for (let i = 0; i < inscricoes.length; i++) {
      const insc = inscricoes[i] as any;
      const telRaw =
        destinatarioTipo === "principal"
          ? insc.telefone || ""
          : insc.telefone_emergencia || insc.telefone_responsavel || "";
      const tel = telRaw.toString().replace(/\D/g, "");
      if (!tel || tel.length < 10) {
        falhas++;
        await supabase.from("emergencia_envios_log").insert({
          inscricao_id: insc.id,
          evento_id: eventoId,
          evento_tipo: eventoTipo,
          tipo_envio: `${tipo}:${destinatarioTipo}`,
          telefone_destino: tel || "",
          nome_contato_emergencia: insc.nome_responsavel,
          nome_participante: insc.nome,
          mensagem_enviada: "",
          status: "falhou",
          erro:
            destinatarioTipo === "principal"
              ? "Telefone do participante ausente ou inválido"
              : "Telefone de emergência ausente ou inválido",
        });
        await supabase.from("comunicacao_envios").insert({
          tipo: tipo === "inicial" ? "emergencia_inicial" : "emergencia_manual",
          segmento: destinatarioTipo,
          destinatario_telefone: tel || "",
          destinatario_nome:
            destinatarioTipo === "principal" ? insc.nome : insc.nome_responsavel,
          conteudo: "",
          status: "erro",
          erro_mensagem:
            destinatarioTipo === "principal"
              ? "Telefone do participante ausente ou inválido"
              : "Telefone de emergência ausente ou inválido",
          evento_id: eventoId,
        });
        continue;
      }

      const mensagemFinal = preencherTemplate(mensagemBase, {
        nomeCompleto: insc.nome,
        nomeEmergencia: insc.nome_responsavel,
        evento: evento.titulo,
        data: dataEventoFmt,
      });

      console.log(
        `[emergencia ${insc.id}] tipo=${tipo} para=${tel}\n  ORIGINAL: ${JSON.stringify(mensagemBase).slice(0, 300)}\n  FINAL:    ${JSON.stringify(mensagemFinal).slice(0, 300)}`,
      );

      try {
        await enviarTexto(tel, mensagemFinal);
        enviados++;
        await supabase.from("emergencia_envios_log").insert({
          inscricao_id: insc.id,
          evento_id: eventoId,
          evento_tipo: eventoTipo,
          tipo_envio: `${tipo}:${destinatarioTipo}`,
          telefone_destino: tel,
          nome_contato_emergencia: insc.nome_responsavel,
          nome_participante: insc.nome,
          mensagem_enviada: mensagemFinal,
          status: "enviado",
        });
        await supabase.from("comunicacao_envios").insert({
          tipo: tipo === "inicial" ? "emergencia_inicial" : "emergencia_manual",
          segmento: destinatarioTipo,
          destinatario_telefone: tel,
          destinatario_nome:
            destinatarioTipo === "principal" ? insc.nome : insc.nome_responsavel,
          conteudo: mensagemFinal,
          status: "enviado",
          evento_id: eventoId,
        });
      } catch (err) {
        falhas++;
        const msg = err instanceof Error ? err.message : String(err);
        erros.push(`${insc.nome}: ${msg}`);
        await supabase.from("emergencia_envios_log").insert({
          inscricao_id: insc.id,
          evento_id: eventoId,
          evento_tipo: eventoTipo,
          tipo_envio: `${tipo}:${destinatarioTipo}`,
          telefone_destino: tel,
          nome_contato_emergencia: insc.nome_responsavel,
          nome_participante: insc.nome,
          mensagem_enviada: mensagemFinal,
          status: "falhou",
          erro: msg,
        });
        await supabase.from("comunicacao_envios").insert({
          tipo: tipo === "inicial" ? "emergencia_inicial" : "emergencia_manual",
          segmento: destinatarioTipo,
          destinatario_telefone: tel,
          destinatario_nome:
            destinatarioTipo === "principal" ? insc.nome : insc.nome_responsavel,
          conteudo: mensagemFinal,
          status: "erro",
          erro_mensagem: msg,
          evento_id: eventoId,
        });
      }

      // Anti-SPAM apenas quando há mais de uma mensagem
      if (i < inscricoes.length - 1) await delayBulk();
    }

    return new Response(
      JSON.stringify({
        success: true,
        enviados,
        falhas,
        total: inscricoes.length,
        erros: erros.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erro enviar-emergencia-evento:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});