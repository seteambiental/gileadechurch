// Módulo compartilhado de envio de WhatsApp via WasenderAPI.
// Provedor único: WasenderAPI (https://wasenderapi.com).
// Endpoint único POST {BASE}/api/send-message com Authorization: Bearer <WASENDER_API_KEY>.
// Importado pelas edge functions via caminho relativo: ../_shared/whatsapp-sender.ts

const RAW_BASE = Deno.env.get("WASENDER_API_URL") || "https://www.wasenderapi.com";
export const WASENDER_API_URL = RAW_BASE.startsWith("http")
  ? RAW_BASE.replace(/\/+$/, "")
  : `https://${RAW_BASE.replace(/\/+$/, "")}`;
export const WASENDER_API_KEY = Deno.env.get("WASENDER_API_KEY") || "";

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
    return await enviarTextoWhatsApp(telefone, caption);
  }
}
