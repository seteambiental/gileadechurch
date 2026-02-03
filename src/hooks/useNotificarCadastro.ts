import { supabase } from "@/integrations/supabase/client";

interface NotificacaoParams {
  tipo: "cadastro" | "alteracao";
  membro_id?: string;
  membro_nome: string;
  membro_email?: string;
  gestor_email?: string;
  gestor_nome?: string;
  detalhes?: string;
  campos_alterados?: string[];
}

export async function notificarCadastroAlteracao(params: NotificacaoParams): Promise<void> {
  try {
    // Só envia se tiver pelo menos um email
    if (!params.membro_email && !params.gestor_email) {
      console.log("Nenhum email para notificar");
      return;
    }

    const { error } = await supabase.functions.invoke("notificar-cadastro-alteracao", {
      body: params,
    });

    if (error) {
      console.error("Erro ao enviar notificação:", error);
    } else {
      console.log("Notificação enviada com sucesso");
    }
  } catch (e) {
    console.error("Erro ao chamar função de notificação:", e);
  }
}

// Helper para identificar campos alterados
export function identificarCamposAlterados(
  original: Record<string, any>,
  atualizado: Record<string, any>,
  mapeamento: Record<string, string>
): string[] {
  const alterados: string[] = [];
  
  for (const [campo, label] of Object.entries(mapeamento)) {
    const valorOriginal = original[campo];
    const valorAtualizado = atualizado[campo];
    
    // Compara valores (tratando null/undefined como iguais a string vazia)
    const v1 = valorOriginal ?? "";
    const v2 = valorAtualizado ?? "";
    
    if (String(v1) !== String(v2)) {
      alterados.push(label);
    }
  }
  
  return alterados;
}
