import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enviarTextoWhatsApp } from "../_shared/whatsapp-sender.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function primeiroNomeDe(nome?: string | null) {
  return (nome || "").trim().split(/\s+/)[0] || "";
}
function preencherTemplate(template: string, vars: any) {
  const nomeCompleto = (vars.nomeCompleto || "").trim();
  const valores: Record<string, string> = {
    NOME_COMPLETO: nomeCompleto,
    NOME: primeiroNomeDe(nomeCompleto) || nomeCompleto,
    NOME_EMERGENCIA: (vars.nomeEmergencia || "").trim() || "responsável",
    EVENTO: vars.evento || "o evento",
    DATA_EVENTO: vars.data || "",
    DATA: vars.data || "",
  };
  return Object.entries(valores).reduce(
    (t, [k, v]) => t.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, "gi"), v),
    template,
  );
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
  return await enviarTextoWhatsApp(telefone, mensagem);
}

function delayBulk() {
  const ms = Math.floor(Math.random() * 15_000) + 15_000;
  return new Promise((res) => setTimeout(res, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hojeStr = new Date().toISOString().slice(0, 10);

    const { data: configs } = await supabase
      .from("evento_emergencia_config")
      .select("*")
      .eq("ativo", true)
      .eq("enviar_recorrente", true);

    let totalEnviados = 0;
    let totalEventos = 0;
    const detalhes: any[] = [];

    for (const cfg of configs || []) {
      // Verifica evento ativo (não passou)
      const tabela =
        cfg.evento_tipo === "impacto" ? "impacto_eventos" : "agenda_igreja";
      const campoData = cfg.evento_tipo === "impacto" ? "data_inicio" : "data_evento";
      const campoFim = "data_fim";
      const { data: evento } = await supabase
        .from(tabela)
        .select(`id, titulo, ${campoData}, ${campoFim}`)
        .eq("id", cfg.evento_id)
        .maybeSingle();
      if (!evento) continue;
      const dataRef =
        (evento as any)[campoFim] || (evento as any)[campoData];
      if (dataRef && dataRef < hojeStr) continue; // evento encerrado

      // Verifica intervalo
      const inicio = cfg.data_inicio_recorrencia || (evento as any)[campoData];
      if (inicio && inicio > hojeStr) continue; // ainda não começou

      // Último envio recorrente registrado
      const { data: ultimo } = await supabase
        .from("emergencia_envios_log")
        .select("enviado_em")
        .eq("evento_id", cfg.evento_id)
        .eq("evento_tipo", cfg.evento_tipo)
        .eq("tipo_envio", "recorrente")
        .order("enviado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ultimo?.enviado_em) {
        const diasDesde = Math.floor(
          (Date.now() - new Date(ultimo.enviado_em).getTime()) / 86_400_000,
        );
        if (diasDesde < (cfg.frequencia_dias || 7)) continue;
      }

      // Buscar inscrições
      const { data: inscricoes } = await supabase
        .from("impacto_inscricoes")
        .select(
          "id, nome, telefone_emergencia, telefone_responsavel, nome_responsavel",
        )
        .eq("evento_id", cfg.evento_id)
        .neq("status_pagamento", "cancelado");

      const dataFmt = formatarDataPt((evento as any)[campoData]);
      const mensagemBase = (cfg.mensagem_recorrente || "").trim();
      if (!mensagemBase) continue;

      let enviadosEvento = 0;
      const list = inscricoes || [];
      for (let i = 0; i < list.length; i++) {
        const insc = list[i] as any;
        const tel = (insc.telefone_emergencia || insc.telefone_responsavel || "")
          .toString()
          .replace(/\D/g, "");
        if (!tel || tel.length < 10) continue;
        const final = preencherTemplate(mensagemBase, {
          nomeCompleto: insc.nome,
          nomeEmergencia: insc.nome_responsavel,
          evento: (evento as any).titulo,
          data: dataFmt,
        });
        try {
          await enviarTexto(tel, final);
          enviadosEvento++;
          await supabase.from("emergencia_envios_log").insert({
            inscricao_id: insc.id,
            evento_id: cfg.evento_id,
            evento_tipo: cfg.evento_tipo,
            tipo_envio: "recorrente",
            telefone_destino: tel,
            nome_contato_emergencia: insc.nome_responsavel,
            nome_participante: insc.nome,
            mensagem_enviada: final,
            status: "enviado",
          });
          await supabase.from("comunicacao_envios").insert({
            tipo: "emergencia_recorrente",
            segmento: "emergencia",
            destinatario_telefone: tel,
            destinatario_nome: insc.nome_responsavel,
            conteudo: final,
            status: "enviado",
            evento_id: cfg.evento_id,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabase.from("emergencia_envios_log").insert({
            inscricao_id: insc.id,
            evento_id: cfg.evento_id,
            evento_tipo: cfg.evento_tipo,
            tipo_envio: "recorrente",
            telefone_destino: tel,
            nome_contato_emergencia: insc.nome_responsavel,
            nome_participante: insc.nome,
            mensagem_enviada: final,
            status: "falhou",
            erro: msg,
          });
          await supabase.from("comunicacao_envios").insert({
            tipo: "emergencia_recorrente",
            segmento: "emergencia",
            destinatario_telefone: tel,
            destinatario_nome: insc.nome_responsavel,
            conteudo: final,
            status: "erro",
            erro_mensagem: msg,
            evento_id: cfg.evento_id,
          });
        }
        if (i < list.length - 1) await delayBulk();
      }
      totalEventos++;
      totalEnviados += enviadosEvento;
      detalhes.push({
        evento_id: cfg.evento_id,
        titulo: (evento as any).titulo,
        enviados: enviadosEvento,
      });
    }

    return new Response(
      JSON.stringify({ success: true, totalEventos, totalEnviados, detalhes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erro processar-emergencia-recorrente:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});