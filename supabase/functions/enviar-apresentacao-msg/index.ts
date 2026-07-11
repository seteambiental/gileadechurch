import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { enviarTextoWhatsApp } from "../_shared/whatsapp-sender.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHURCH_WHATSAPP = "41998406740";

function formatarDataBR(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { apresentacaoId, tipo } = await req.json();
    if (!apresentacaoId || !["recebida", "confirmacao"].includes(tipo)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: insc, error } = await supabase
      .from("apresentacao_criancas")
      .select("*")
      .eq("id", apresentacaoId)
      .single();
    if (error || !insc) throw new Error("Inscrição não encontrada");

    // Resolver telefones dos destinatários
    const telefones = new Set<string>();
    if (insc.familia_membro) {
      const ids = [insc.pai_member_id, insc.mae_member_id].filter(Boolean);
      if (ids.length) {
        const { data: membros } = await supabase
          .from("members")
          .select("whatsapp")
          .in("id", ids);
        (membros || []).forEach((m: any) => {
          const t = (m.whatsapp || "").replace(/\D/g, "");
          if (t.length >= 10) telefones.add(t);
        });
      }
    } else {
      const t = (insc.contato_whatsapp || "").replace(/\D/g, "");
      if (t.length >= 10) telefones.add(t);
    }

    if (telefones.size === 0) {
      return new Response(JSON.stringify({ success: false, motivo: "sem_telefone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nome = insc.crianca_nome || "sua criança";

    // Aviso para o WhatsApp da igreja (somente na inscrição recebida) — best-effort.
    if (tipo === "recebida") {
      try {
        const responsavel =
          insc.pai_nome || insc.mae_nome || null;
        const linhas = [
          "🍼 *Nova inscrição de Apresentação de Criança*",
          "",
          `👶 Criança: ${nome}`,
          responsavel ? `👪 Responsável: ${responsavel}` : null,
          `⛪ Família membro da Gileade: ${insc.familia_membro ? "Sim" : "Não"}`,
          "",
          "Acesse o módulo *Organização de Culto* para conferir e aprovar.",
        ].filter(Boolean);
        await enviarTextoWhatsApp(CHURCH_WHATSAPP, linhas.join("\n"));
      } catch (e) {
        console.warn("[enviar-apresentacao-msg] falha aviso igreja:", e);
      }
    }

    let mensagem = "";
    if (tipo === "recebida") {
      mensagem =
        `Olá! 🙏\n\nRecebemos a inscrição de *${nome}* para a Apresentação de Crianças na Igreja Gileade. ` +
        `Muito obrigado!\n\nAguarde o contato com a *confirmação da data* em que a criança poderá ser apresentada. ` +
        `Deus abençoe! 💛`;
    } else {
      const dataBR = formatarDataBR(insc.data_apresentacao);
      mensagem =
        `Olá! 🙏\n\nA apresentação de *${nome}* foi *confirmada*` +
        (dataBR ? ` para o dia *${dataBR}*` : "") +
        `.\n\nContamos com a presença de vocês na Igreja Gileade. Deus abençoe! 💛`;
    }

    let ok = 0;
    let fail = 0;
    const lista = Array.from(telefones);
    for (let i = 0; i < lista.length; i++) {
      try {
        await enviarTextoWhatsApp(lista[i], mensagem);
        ok++;
      } catch (e) {
        console.error("Falha envio apresentacao:", e);
        fail++;
      }
      if (i < lista.length - 1) {
        const delay = Math.floor(Math.random() * 15000) + 15000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return new Response(JSON.stringify({ success: true, ok, fail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[enviar-apresentacao-msg]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
