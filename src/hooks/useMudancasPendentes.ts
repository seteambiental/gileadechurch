import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MudancaPendente {
  id: string;
  solicitante_id: string | null;
  aprovador_id: string | null;
  tipo_mudanca: string;
  acao: string;
  ministry_id: string | null;
  casa_refugio_id: string | null;
  condominio_id: string | null;
  membro_id: string | null;
  membro_atual_id: string | null;
  funcao_id: string | null;
  status: string;
  motivo_rejeicao: string | null;
  email_enviado: boolean;
  created_at: string;
  updated_at: string;
  aprovado_em: string | null;
  aprovado_por: string | null;
  // Relations
  membro?: { id: string; full_name: string } | null;
  membro_atual?: { id: string; full_name: string } | null;
  solicitante?: { id: string; full_name: string } | null;
  ministry?: { id: string; name: string } | null;
  casa_refugio?: { id: string; name: string } | null;
  condominio?: { id: string; name: string } | null;
  funcao?: { id: string; nome: string } | null;
}

export const tipoMudancaLabels: Record<string, string> = {
  lider_ministerio: "Líder de Ministério",
  lider_esposa_ministerio: "Líder de Ministério",
  integrante_ministerio: "Integrante de Ministério",
  lider_casa_refugio: "Líder de Casa Refúgio",
  lider_esposa_casa_refugio: "Líder de Casa Refúgio",
  supervisor_casa_refugio: "Supervisor de Casa Refúgio",
  supervisor_esposa_casa_refugio: "Supervisor de Casa Refúgio",
  anfitriao_casa_refugio: "Anfitrião de Casa Refúgio",
  anfitriao_esposa_casa_refugio: "Anfitrião de Casa Refúgio",
  sindico_condominio: "Síndico de Condomínio",
  sindico_esposa_condominio: "Síndico de Condomínio",
};

export const acaoLabels: Record<string, string> = {
  adicionar: "Adicionar",
  remover: "Remover",
  alterar: "Alterar",
};

// Tipos de perfis que não precisam de aprovação
export const PERFIS_SEM_APROVACAO = ["pastor_geral", "pastor_auxiliar", "admin"];

// Função para verificar se um membro tem perfil que dispensa aprovação
export async function isPerfilSemAprovacao(memberId: string): Promise<boolean> {
  const { data } = await supabase
    .from("member_functions")
    .select("function_type")
    .eq("member_id", memberId);
  
  if (!data) return false;
  
  return data.some(fn => PERFIS_SEM_APROVACAO.includes(fn.function_type));
}

// Função síncrona para verificar por function_types já carregados
export function hasPerfilSemAprovacao(functionTypes: string[]): boolean {
  return functionTypes.some(ft => PERFIS_SEM_APROVACAO.includes(ft));
}

interface CreateMudancaParams {
  solicitante_id: string;
  aprovador_id: string;
  tipo_mudanca: string;
  acao: "adicionar" | "remover" | "alterar";
  ministry_id?: string | null;
  casa_refugio_id?: string | null;
  condominio_id?: string | null;
  membro_id: string;
  membro_atual_id?: string | null;
  funcao_id?: string | null;
}

export function useMudancasPendentes(aprovadorId?: string) {
  const queryClient = useQueryClient();

  const { data: mudancas = [], isLoading, refetch } = useQuery({
    queryKey: ["mudancas-pendentes", aprovadorId],
    queryFn: async () => {
      let query = supabase
        .from("mudancas_pendentes")
        .select(`
          *,
          membro:members!mudancas_pendentes_membro_id_fkey(id, full_name),
          membro_atual:members!mudancas_pendentes_membro_atual_id_fkey(id, full_name),
          solicitante:members!mudancas_pendentes_solicitante_id_fkey(id, full_name),
          ministry:ministries(id, name),
          casa_refugio:casas_refugio(id, name),
          condominio:condominios(id, name),
          funcao:ministerio_funcoes(id, nome)
        `)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (aprovadorId) {
        query = query.eq("aprovador_id", aprovadorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MudancaPendente[];
    },
    enabled: true,
  });

  const createMudancaMutation = useMutation({
    mutationFn: async (params: CreateMudancaParams) => {
      const { data, error } = await supabase
        .from("mudancas_pendentes")
        .insert({
          solicitante_id: params.solicitante_id,
          aprovador_id: params.aprovador_id,
          tipo_mudanca: params.tipo_mudanca,
          acao: params.acao,
          ministry_id: params.ministry_id || null,
          casa_refugio_id: params.casa_refugio_id || null,
          condominio_id: params.condominio_id || null,
          membro_id: params.membro_id,
          membro_atual_id: params.membro_atual_id || null,
          funcao_id: params.funcao_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação por email
      try {
        await supabase.functions.invoke("notificar-mudanca-pendente", {
          body: { mudanca_id: data.id },
        });
      } catch (emailError) {
        console.error("Erro ao enviar email de notificação:", emailError);
        // Não falhar se o email não for enviado
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mudancas-pendentes"] });
      toast.success("Solicitação enviada para aprovação!");
    },
    onError: (error) => {
      console.error("Erro ao criar solicitação:", error);
      toast.error("Erro ao criar solicitação de mudança");
    },
  });

  const processarMudancaMutation = useMutation({
    mutationFn: async ({ 
      mudanca_id, 
      aprovar, 
      motivo_rejeicao, 
      aprovador_member_id 
    }: { 
      mudanca_id: string; 
      aprovar: boolean; 
      motivo_rejeicao?: string;
      aprovador_member_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("processar-aprovacao-mudanca", {
        body: { mudanca_id, aprovar, motivo_rejeicao, aprovador_member_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mudancas-pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["casas_refugio"] });
      queryClient.invalidateQueries({ queryKey: ["condominios"] });
      queryClient.invalidateQueries({ queryKey: ["member-functions"] });
      
      if (variables.aprovar) {
        toast.success("Mudança aprovada com sucesso!");
      } else {
        toast.info("Mudança rejeitada");
      }
    },
    onError: (error) => {
      console.error("Erro ao processar mudança:", error);
      toast.error("Erro ao processar aprovação");
    },
  });

  return {
    mudancas,
    isLoading,
    refetch,
    createMudanca: createMudancaMutation.mutate,
    isCreating: createMudancaMutation.isPending,
    processarMudanca: processarMudancaMutation.mutate,
    isProcessing: processarMudancaMutation.isPending,
  };
}

// Função para determinar o aprovador baseado no tipo de mudança
export async function getAprovadorId(
  tipoMudanca: string,
  entityId: string
): Promise<string | null> {
  if (tipoMudanca.includes("ministerio")) {
    // Líder/integrante de ministério → Pastor aprova
    const { data } = await supabase
      .from("member_functions")
      .select("member_id")
      .eq("function_type", "pastor_geral")
      .limit(1)
      .single();
    return data?.member_id || null;
  }

  if (tipoMudanca === "lider_casa_refugio" || tipoMudanca === "lider_esposa_casa_refugio") {
    // Líder de casa refúgio → Supervisor aprova
    const { data } = await supabase
      .from("casas_refugio")
      .select("supervisor_id")
      .eq("id", entityId)
      .single();
    return data?.supervisor_id || null;
  }

  if (tipoMudanca === "supervisor_casa_refugio" || tipoMudanca === "supervisor_esposa_casa_refugio") {
    // Supervisor → Síndico aprova
    const { data: casa } = await supabase
      .from("casas_refugio")
      .select("condominio")
      .eq("id", entityId)
      .single();

    if (casa?.condominio) {
      const { data: cond } = await supabase
        .from("condominios")
        .select("sindico_id")
        .eq("name", casa.condominio)
        .single();
      return cond?.sindico_id || null;
    }
    return null;
  }

  if (tipoMudanca === "sindico_condominio" || tipoMudanca === "sindico_esposa_condominio") {
    // Síndico → Pastor aprova
    const { data } = await supabase
      .from("member_functions")
      .select("member_id")
      .eq("function_type", "pastor_geral")
      .limit(1)
      .single();
    return data?.member_id || null;
  }

  if (tipoMudanca.includes("anfitriao")) {
    // Anfitrião → Líder da casa aprova
    const { data } = await supabase
      .from("casas_refugio")
      .select("lider_id")
      .eq("id", entityId)
      .single();
    return data?.lider_id || null;
  }

  return null;
}
