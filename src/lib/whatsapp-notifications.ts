import { supabase } from "@/integrations/supabase/client";

/**
 * Envia (best-effort) a mensagem padrão "INSCRIÇÃO RECEBIDA" via WhatsApp.
 * Falhas são silenciadas (apenas logadas) para não quebrar o fluxo de inscrição.
 */
export async function dispararMensagemInscricaoRecebida(params: {
  telefone?: string | null;
  nome?: string | null;
  tituloEvento?: string | null;
}) {
  try {
    const tel = (params.telefone || "").replace(/\D/g, "");
    const nome = (params.nome || "").trim();
    if (!tel || tel.length < 10 || !nome) return;
    await supabase.functions.invoke("enviar-whatsapp", {
      body: {
        action: "inscricao_recebida",
        telefone: tel,
        nome,
        tituloEvento: params.tituloEvento || null,
      },
    });
  } catch (err) {
    console.warn("[whatsapp] falha ao enviar inscricao_recebida:", err);
  }
}

/**
 * Envia (best-effort) a mensagem "CADASTRO APROVADO" para o novo membro.
 */
export async function dispararMensagemCadastroAprovado(params: {
  telefone?: string | null;
  nome?: string | null;
  memberId?: string | null;
}) {
  try {
    const tel = (params.telefone || "").replace(/\D/g, "");
    const nome = (params.nome || "").trim();
    if (!tel || tel.length < 10 || !nome) return;
    await supabase.functions.invoke("enviar-whatsapp", {
      body: {
        action: "cadastro_aprovado",
        telefone: tel,
        nome,
        memberId: params.memberId || null,
      },
    });
  } catch (err) {
    console.warn("[whatsapp] falha ao enviar cadastro_aprovado:", err);
  }
}