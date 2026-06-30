// Módulo compartilhado de envio de WhatsApp via WasenderAPI.
// Provedor único: WasenderAPI (https://wasenderapi.com).
// Endpoint único POST {BASE}/api/send-message com Authorization: Bearer <WASENDER_API_KEY>.
// Importado pelas edge functions via caminho relativo: ../_shared/whatsapp-sender.ts

const RAW_BASE = Deno.env.get("WASENDER_API_URL") || "https://www.wasenderapi.com";
export const WASENDER_API_URL = RAW_BASE.startsWith("http")
  ? RAW_BASE.replace(/\/+$/, "")
  : `https://${RAW_BASE.replace(/\/+$/, "")}`;
export const WASENDER_API_KEY = Deno.env.get("WASENDER_API_KEY") || "";

export type WasenderReceipt = {
  msgId: string | null;
  apiMsgId: string | null;
  messageKeyId: string | null;
  providerStatus: string | null;
  providerStatusCode: number | null;
  raw: unknown;
};

export function normalizarWasenderEnvio(result: any): WasenderReceipt {
  const data = result?.data ?? result ?? {};
  const apiMsgIdRaw = data?.msgId ?? data?.messageId ?? null;
  const messageKeyIdRaw = data?.key?.id ?? data?.id ?? data?.result?.key?.id ?? null;
  // O Wasender retorna dois identificadores: msgId numérico para consulta na API
  // e key.id alfanumérico nos webhooks de entrega/leitura. Para auditoria e webhook,
  // guardamos o key.id como identificador principal quando ele existir.
  const msgIdRaw = messageKeyIdRaw ?? apiMsgIdRaw;
  return {
    msgId: msgIdRaw === null || msgIdRaw === undefined ? null : String(msgIdRaw),
    apiMsgId: apiMsgIdRaw === null || apiMsgIdRaw === undefined ? null : String(apiMsgIdRaw),
    messageKeyId: messageKeyIdRaw === null || messageKeyIdRaw === undefined ? null : String(messageKeyIdRaw),
    providerStatus: data?.status === undefined || data?.status === null ? null : String(data.status),
    providerStatusCode: typeof data?.status === "number" ? data.status : null,
    raw: result,
  };
}

export function statusEntregaPorCodigo(statusCode: number | null | undefined): {
  status: string;
  providerStatus: string | null;
} {
  switch (statusCode) {
    case 0:
      return { status: "erro", providerStatus: "failed" };
    case 3:
      return { status: "entregue", providerStatus: "delivered" };
    case 4:
      return { status: "lido", providerStatus: "read" };
    case 5:
      return { status: "lido", providerStatus: "played" };
    case 1:
      return { status: "aceito_provedor", providerStatus: "pending" };
    case 2:
      return { status: "aceito_provedor", providerStatus: "sent" };
    default:
      return { status: "aceito_provedor", providerStatus: null };
  }
}

export function statusEntregaPorTexto(status?: string | null): {
  status: string;
  providerStatus: string | null;
} {
  const s = String(status || "").toLowerCase();
  if (["failed", "error", "undelivered", "not_delivered"].includes(s)) {
    return { status: "erro", providerStatus: s };
  }
  if (["delivered"].includes(s)) return { status: "entregue", providerStatus: s };
  if (["read", "played"].includes(s)) return { status: "lido", providerStatus: s };
  if (["pending", "sent", "in_progress", "queued"].includes(s)) {
    return { status: "aceito_provedor", providerStatus: s };
  }
  return { status: "aceito_provedor", providerStatus: s || null };
}

// true quando a chave do provedor está configurada.
export function whatsappConfigurado(): boolean {
  return !!WASENDER_API_KEY;
}

// Lista de variáveis ausentes (para mensagens de diagnóstico).
export function whatsappConfigFaltante(): string[] {
  const missing: string[] = [];
  if (!WASENDER_API_KEY) missing.push("WASENDER_API_KEY");
  return missing;
}

// Verifica se a sessão do WhatsApp (WasenderAPI) está conectada.
// Retorna { conectado, estado, erro? }. Use antes de disparos em massa
// para abortar cedo com mensagem clara quando a sessão estiver caída.
export async function verificarConexaoWhatsApp(): Promise<{
  conectado: boolean;
  estado: string;
  erro?: string;
}> {
  if (!WASENDER_API_KEY) {
    return { conectado: false, estado: "nao_configurado", erro: "WASENDER_API_KEY ausente" };
  }
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${WASENDER_API_URL}/api/status`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WASENDER_API_KEY}`,
      },
      signal: ctrl.signal,
    });
    clearTimeout(to);
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text?.slice(0, 300) };
    }
    const data = body?.data ?? body?.session ?? body ?? {};
    const estado = String(data?.status ?? data?.state ?? body?.status ?? "unknown");
    const conectado = ["connected", "open", "online"].includes(estado.toLowerCase());
    return { conectado, estado };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { conectado: false, estado: "erro", erro: msg };
  }
}

// Lança erro se a sessão não estiver conectada. Atalho para disparos em massa.
export async function exigirWhatsappConectado(): Promise<void> {
  const status = await verificarConexaoWhatsApp();
  if (!status.conectado) {
    throw new Error(
      `A sessão do WhatsApp não está conectada (estado: ${status.estado}). ` +
      `Reconecte o WhatsApp antes de enviar mensagens em massa.` +
      (status.erro ? ` Detalhe: ${status.erro}` : ""),
    );
  }
}

// Formata o telefone para o padrão E.164 exigido pelo WasenderAPI (+55...).
export function formatPhoneE164(telefone: string): string {
  const clean = (telefone || "").replace(/\D/g, "");
  if (!clean) return "";
  const withCountry = clean.startsWith("55") ? clean : `55${clean}`;
  return `+${withCountry}`;
}

async function postSendMessage(payload: Record<string, unknown>) {
  const res = await fetch(`${WASENDER_API_URL}/api/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WASENDER_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  let result: any = null;
  const text = await res.text();
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = { raw: text?.slice(0, 500) };
  }

  if (!res.ok || result?.success === false) {
    const detail = typeof result === "object" ? JSON.stringify(result).slice(0, 500) : String(result);
    throw new Error(result?.message || result?.error || `Erro ao enviar mensagem (status ${res.status}): ${detail}`);
  }

  return result;
}

export async function consultarMensagemWasender(msgId: string): Promise<WasenderReceipt> {
  if (!WASENDER_API_KEY) throw new Error("WASENDER_API_KEY ausente");
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${WASENDER_API_URL}/api/messages/${encodeURIComponent(msgId)}/info`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WASENDER_API_KEY}`,
      },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(to);
  }

  const text = await res.text();
  let result: any = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = { raw: text?.slice(0, 500) };
  }

  if (!res.ok || result?.success === false) {
    const detail = typeof result === "object" ? JSON.stringify(result).slice(0, 500) : String(result);
    throw new Error(result?.message || result?.error || `Erro ao consultar mensagem (status ${res.status}): ${detail}`);
  }

  return normalizarWasenderEnvio(result);
}

// Envia uma mensagem de texto simples.
export async function enviarTextoWhatsApp(telefone: string, mensagem: string) {
  const to = formatPhoneE164(telefone);
  if (!to) throw new Error("Telefone inválido");
  console.log(`Enviando texto WasenderAPI para: ${to}`);
  return await postSendMessage({ to, text: mensagem });
}

// Envia uma imagem (via URL pública) com legenda opcional.
export async function enviarImagemWhatsApp(telefone: string, imageUrl: string, caption = "") {
  const to = formatPhoneE164(telefone);
  if (!to) throw new Error("Telefone inválido");
  console.log(`Enviando imagem WasenderAPI para: ${to}`);
  return await postSendMessage({ to, text: caption, imageUrl });
}

// Tenta enviar imagem; se falhar, cai para texto (mesma política anterior).
export async function enviarImagemComFallbackTexto(telefone: string, imageUrl: string, caption: string) {
  try {
    return await enviarImagemWhatsApp(telefone, imageUrl, caption);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Falha ao enviar imagem; tentando texto. Motivo: ${msg}`);
    // Espera para respeitar a proteção do provedor (1 msg a cada 5s) antes do fallback.
    await new Promise((resolve) => setTimeout(resolve, 6000));
    return await enviarTextoWhatsApp(telefone, caption);
  }
}

export type MediaType = "image" | "video" | "document";

// Detecta o tipo de mídia pela extensão da URL.
export function detectarMediaType(url: string): MediaType {
  const u = (url || "").split("?")[0].toLowerCase();
  if (/\.(jpe?g|png|webp|gif|bmp)$/.test(u)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm|3gp)$/.test(u)) return "video";
  return "document";
}

function fileNameDeUrl(url: string): string {
  try {
    const u = new URL(url);
    const base = u.pathname.split("/").pop() || "arquivo";
    return decodeURIComponent(base);
  } catch {
    return "arquivo";
  }
}

// Envia mídia (imagem, vídeo ou documento) via URL pública, com legenda opcional.
export async function enviarMidiaWhatsApp(
  telefone: string,
  midiaUrl: string,
  caption = "",
  mediatype?: MediaType,
  fileName?: string,
) {
  const to = formatPhoneE164(telefone);
  if (!to) throw new Error("Telefone inválido");
  const tipo = mediatype || detectarMediaType(midiaUrl);
  const payload: Record<string, unknown> = { to, text: caption };
  if (tipo === "image") {
    payload.imageUrl = midiaUrl;
  } else if (tipo === "video") {
    payload.videoUrl = midiaUrl;
  } else {
    payload.documentUrl = midiaUrl;
    payload.fileName = fileName || fileNameDeUrl(midiaUrl);
  }
  console.log(`Enviando mídia (${tipo}) WasenderAPI para: ${to}`);
  return await postSendMessage(payload);
}
