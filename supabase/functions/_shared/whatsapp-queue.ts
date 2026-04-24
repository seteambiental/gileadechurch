// Helpers compartilhados para enfileirar envios de WhatsApp
// Importado por edge functions via caminho relativo.

export type FilaItem = {
  tipo: string;
  segmento?: string | null;
  destinatario_telefone: string;
  destinatario_nome?: string | null;
  destinatario_member_id?: string | null;
  conteudo: string;
  midia_url?: string | null;
  evento_id?: string | null;
  iniciado_por?: string | null;
  max_tentativas?: number;
};

// Hash determinístico simples (FNV-1a) para deduplicação.
// Não precisa ser criptográfico — só evitar duplicatas próximas.
function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // garante positivo e em hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function dedupeHash(item: FilaItem): string {
  const tel = (item.destinatario_telefone || "").replace(/\D/g, "");
  const base = [
    item.tipo,
    tel,
    item.evento_id || "",
    item.midia_url || "",
    item.conteudo || "",
  ].join("|");
  return fnv1a(base);
}

// Verifica duplicata em janela de 24h e enfileira se for novo.
// Retorna { enfileirado: boolean, motivo?: string, fila_id?: string }
export async function enfileirarComDedupe(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  item: FilaItem,
  janelaHoras = 24,
) {
  const hash = dedupeHash(item);
  const desde = new Date(Date.now() - janelaHoras * 3600_000).toISOString();

  // Verifica duplicata recente (pendente, processando, enviado)
  const { data: existente } = await supabase
    .from("comunicacao_fila")
    .select("id, status")
    .eq("dedupe_hash", hash)
    .gte("created_at", desde)
    .in("status", ["pendente", "processando", "enviado"])
    .limit(1)
    .maybeSingle();

  if (existente) {
    return {
      enfileirado: false,
      motivo: `Duplicata detectada (status=${existente.status})`,
      fila_id: existente.id as string,
    };
  }

  const { data: inserido, error } = await supabase
    .from("comunicacao_fila")
    .insert({
      tipo: item.tipo,
      segmento: item.segmento ?? null,
      destinatario_telefone: item.destinatario_telefone,
      destinatario_nome: item.destinatario_nome ?? null,
      destinatario_member_id: item.destinatario_member_id ?? null,
      conteudo: item.conteudo,
      midia_url: item.midia_url ?? null,
      evento_id: item.evento_id ?? null,
      iniciado_por: item.iniciado_por ?? null,
      dedupe_hash: hash,
      max_tentativas: item.max_tentativas ?? 3,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error) {
    return { enfileirado: false, motivo: error.message };
  }
  return { enfileirado: true, fila_id: inserido!.id as string };
}