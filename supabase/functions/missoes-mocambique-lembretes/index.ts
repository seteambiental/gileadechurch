import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enfileirarComDedupe } from "../_shared/whatsapp-queue.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mesRefHoje(): string {
  // YYYY-MM em UTC-3
  const now = new Date(Date.now() - 3 * 3600_000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function diaHoje(): number {
  const now = new Date(Date.now() - 3 * 3600_000);
  return now.getUTCDate();
}

function ultimoDiaDoMes(): number {
  const now = new Date(Date.now() - 3 * 3600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const manual = body?.manual === true;
    const forcarTodos = body?.forcar_todos === true; // ignora dia_vencimento (envio manual em massa)

    // Config
    const { data: cfg } = await supabase
      .from("missoes_mocambique_config")
      .select("template_mensagem, lembretes_ativos")
      .limit(1)
      .maybeSingle();

    if (!cfg) {
      return new Response(
        JSON.stringify({ ok: false, motivo: "Sem configuração cadastrada" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!cfg.lembretes_ativos && !manual) {
      return new Response(
        JSON.stringify({ ok: true, motivo: "Lembretes desativados", enviados: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hoje = diaHoje();
    const ultimoDia = ultimoDiaDoMes();
    const mesRef = mesRefHoje();

    // Busca contribuintes ativos
    let query = supabase
      .from("missoes_mocambique_contribuintes")
      .select(
        "id, nome_manual, valor_mensal, dia_vencimento, lembrete_enviado_mes, forma_contribuicao, member_id, members:member_id(full_name, whatsapp)",
      )
      .eq("ativo", true);

    const { data: contribs, error } = await query;
    if (error) throw error;

    const elegiveis = (contribs || []).filter((c: any) => {
      if (forcarTodos) return true;
      const dia = c.dia_vencimento ?? 10;
      // Se o dia configurado é maior que o último dia do mês (ex.: 31 em Fev), dispara no último dia
      const diaEfetivo = dia > ultimoDia ? ultimoDia : dia;
      if (diaEfetivo !== hoje) return false;
      if (c.lembrete_enviado_mes === mesRef) return false;
      return true;
    });

    let enfileirados = 0;
    let semTelefone = 0;
    const detalhes: any[] = [];

    for (const c of elegiveis) {
      const nome = (c.members?.full_name || c.nome_manual || "Irmão(ã)").toString();
      const primeiroNome = nome.split(" ")[0];
      const telefone = (c.members?.whatsapp || "").replace(/\D/g, "");

      if (!telefone || telefone.length < 10) {
        semTelefone++;
        detalhes.push({ id: c.id, nome, status: "sem_telefone" });
        continue;
      }

      const valor = Number(c.valor_mensal || 0);
      const conteudo = renderTemplate(cfg.template_mensagem, {
        nome: primeiroNome,
        nome_completo: nome,
        valor: fmtBRL(valor),
        forma: c.forma_contribuicao || "—",
        mes: mesRef,
      });

      const res = await enfileirarComDedupe(supabase, {
        tipo: "missoes_mocambique_lembrete",
        segmento: mesRef,
        destinatario_telefone: telefone,
        destinatario_nome: nome,
        destinatario_member_id: c.member_id || null,
        conteudo,
      }, 20); // dedupe em 20h evita reenvio no mesmo dia

      if (res.enfileirado) {
        enfileirados++;
        await supabase
          .from("missoes_mocambique_contribuintes")
          .update({ lembrete_enviado_mes: mesRef })
          .eq("id", c.id);
        detalhes.push({ id: c.id, nome, status: "enfileirado" });
      } else {
        detalhes.push({ id: c.id, nome, status: "duplicado", motivo: res.motivo });
      }
    }

    // Dispara o processador da fila (envio escalonado 5-15s entre mensagens)
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/processar-fila-whatsapp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.warn("Falha ao acionar processar-fila-whatsapp:", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mes_ref: mesRef,
        dia: hoje,
        elegiveis: elegiveis.length,
        enfileirados,
        sem_telefone: semTelefone,
        detalhes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Erro missoes-mocambique-lembretes:", e);
    return new Response(
      JSON.stringify({ ok: false, erro: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});