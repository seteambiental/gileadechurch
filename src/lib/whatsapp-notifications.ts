import { supabase } from "@/integrations/supabase/client";

/**
 * Envia (best-effort) a mensagem padrão "INSCRIÇÃO RECEBIDA" via WhatsApp.
 * Falhas são silenciadas (apenas logadas) para não quebrar o fluxo de inscrição.
 */
export async function dispararMensagemInscricaoRecebida(params: {
  telefone?: string | null;
  nome?: string | null;
  tituloEvento?: string | null;
  eventoId?: string | null;
  eventoTipo?: "agenda" | "impacto" | null;
  tipoInscricao?: string | null;
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
        eventoId: params.eventoId || null,
        eventoTipo: params.eventoTipo || null,
        tipoInscricao: params.tipoInscricao || null,
      },
    });
  } catch (err) {
    console.warn("[whatsapp] falha ao enviar inscricao_recebida:", err);
  }
}

/**
 * Dispara a mensagem inicial para o contato de emergência de uma inscrição.
 * Best-effort: falhas não interrompem o fluxo principal.
 */
export async function dispararMensagemEmergenciaInicial(params: {
  eventoId: string;
  eventoTipo: "impacto" | "agenda";
  inscricaoId: string;
}) {
  try {
    await supabase.functions.invoke("enviar-emergencia-evento", {
      body: {
        tipo: "inicial",
        eventoId: params.eventoId,
        eventoTipo: params.eventoTipo,
        inscricaoId: params.inscricaoId,
      },
    });
  } catch (err) {
    console.warn("[whatsapp] falha ao enviar emergencia_inicial:", err);
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

/**
 * Dispara o envio do flyer da homepage para todos os membros (best-effort).
 */
export async function dispararEnvioFlyerHomepage(params: {
  flyerUrl: string;
  caption?: string;
  eventoId?: string | null;
}) {
  return await supabase.functions.invoke("enviar-whatsapp", {
    body: {
      action: "enviar_flyer_homepage",
      flyerUrl: params.flyerUrl,
      caption: params.caption || null,
      eventoId: params.eventoId || null,
    },
  });
}

export type SegmentoEnvio =
  | "todos_membros"
  | "lideres_ministerio"
  | "lideres_casa_refugio"
  | "supervisores_casa_refugio"
  | "sindicos_condominio"
  | "pastores"
  | "integrantes_ministerio";

/**
 * Envio segmentado para múltiplos grupos (líderes, supervisores, etc.).
 */
export async function dispararEnvioSegmentado(params: {
  mensagem: string;
  segmentos: SegmentoEnvio[];
  ministerioId?: string | null;
  midiaUrl?: string | null;
}) {
  return await supabase.functions.invoke("enviar-whatsapp", {
    body: {
      action: "enviar_segmentado",
      mensagem: params.mensagem,
      segmentos: params.segmentos,
      ministerioId: params.ministerioId || null,
      midiaUrl: params.midiaUrl || null,
    },
  });
}
/**
 * Número de WhatsApp da igreja (aparelho conectado ao envio de mensagens).
 * Recebe o aviso de recebimento de novas inscrições de apresentação de crianças.
 */
export const CHURCH_WHATSAPP = "41998406740";

/**
 * Envia (best-effort) um aviso simples para o WhatsApp da igreja informando
 * que uma nova inscrição de apresentação de criança foi recebida.
 */
export async function dispararAvisoApresentacaoRecebida(params: {
  criancaNome: string;
  responsavel?: string | null;
  membro?: boolean;
}) {
  try {
    const linhas = [
      "🍼 *Nova inscrição de Apresentação de Criança*",
      "",
      `👶 Criança: ${params.criancaNome}`,
      params.responsavel ? `👪 Responsável: ${params.responsavel}` : null,
      `⛪ Família membro da Gileade: ${params.membro ? "Sim" : "Não"}`,
      "",
      "Acesse o módulo *Organização de Culto* para conferir e aprovar.",
    ].filter(Boolean);

    await supabase.functions.invoke("enviar-whatsapp", {
      body: {
        action: "mensagem_direta",
        telefone: CHURCH_WHATSAPP,
        nome: "Igreja Gileade",
        mensagem: linhas.join("\n"),
      },
    });
  } catch (err) {
    console.warn("[whatsapp] falha ao enviar aviso apresentacao:", err);
  }
}
