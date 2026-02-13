import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Lista de todos os módulos configuráveis
export const MODULOS_DISPONIVEIS = [
  { id: "cadastros", label: "Cadastros", description: "Gestão de membros, visitantes, ministérios" },
  { id: "homepage", label: "Homepage", description: "Editar página inicial da igreja" },
  { id: "agenda", label: "Agenda", description: "Programação e eventos" },
  { id: "financeiro", label: "Financeiro", description: "Gestão financeira" },
  { id: "indicadores", label: "Indicadores", description: "Métricas e relatórios" },
  { id: "casas_refugio", label: "Casas Refúgio", description: "Gerenciar todas as casas refúgio" },
  { id: "condominios", label: "Condomínios", description: "Gerenciar condomínios" },
  { id: "consolidacao", label: "Consolidação", description: "Novos convertidos" },
  { id: "kids", label: "Kids", description: "Ministério infantil" },
  { id: "acao_social", label: "Ação Social", description: "Ajuda comunitária" },
  { id: "aprovacoes", label: "Aprovações", description: "Aprovar solicitações e mudanças" },
  { id: "ministerios_todos", label: "Todos os Ministérios", description: "Acesso a todos os ministérios" },
] as const;

export type ModuloId = typeof MODULOS_DISPONIVEIS[number]["id"];

export const usePastorAuxiliarPermissoes = (pastorUserId?: string) => {
  const queryClient = useQueryClient();

  const { data: permissoes, isLoading } = useQuery({
    queryKey: ["pastor-auxiliar-permissoes", pastorUserId],
    queryFn: async () => {
      if (!pastorUserId) return [];
      const { data, error } = await supabase
        .from("pastor_auxiliar_permissoes")
        .select("*")
        .eq("user_id", pastorUserId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pastorUserId,
  });

  const togglePermissao = useMutation({
    mutationFn: async ({ modulo, ativo }: { modulo: string; ativo: boolean }) => {
      if (!pastorUserId) throw new Error("Usuário não selecionado");
      
      // Upsert
      const { error } = await supabase
        .from("pastor_auxiliar_permissoes")
        .upsert(
          { user_id: pastorUserId, modulo, ativo },
          { onConflict: "user_id,modulo" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pastor-auxiliar-permissoes", pastorUserId] });
      toast.success("Permissão atualizada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar permissão: " + err.message);
    },
  });

  const hasPermission = (modulo: string): boolean => {
    if (!permissoes) return false;
    const perm = permissoes.find((p) => p.modulo === modulo);
    return perm?.ativo ?? false;
  };

  return { permissoes, isLoading, togglePermissao, hasPermission };
};

// Hook para o próprio pastor auxiliar verificar suas permissões
export const useMyPastorAuxiliarPermissoes = (userId?: string, isPastorAuxiliar?: boolean) => {
  const { data: permissoes } = useQuery({
    queryKey: ["my-pastor-auxiliar-permissoes", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("pastor_auxiliar_permissoes")
        .select("modulo, ativo")
        .eq("user_id", userId)
        .eq("ativo", true);
      if (error) throw error;
      return data?.map((p) => p.modulo) || [];
    },
    enabled: !!userId && !!isPastorAuxiliar,
    staleTime: 1000 * 60 * 5,
  });

  return {
    allowedModules: permissoes || [],
    hasModule: (modulo: string) => permissoes?.includes(modulo) ?? false,
  };
};
