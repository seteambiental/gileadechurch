import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Tipos de função que têm acesso ao portal de líderes
const LEADER_FUNCTION_TYPES = [
  "pastor_geral",
  "pastor_auxiliar",
  "sindico_condominio",
  "supervisor_condominio",
  "lider_casa_refugio",
  "lider_ministerio",
  "integrante_ministerio",
];

export interface UserAccess {
  isAdmin: boolean;
  isLeader: boolean;
  roles: string[];
  functions: string[];
  loading: boolean;
}

export const useUserAccess = (userId: string | undefined) => {
  const { data, isLoading } = useQuery({
    queryKey: ["user-access", userId],
    queryFn: async (): Promise<Omit<UserAccess, "loading">> => {
      if (!userId) return { isAdmin: false, isLeader: false, roles: [], functions: [] };

      // Verificar se é admin na tabela user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roles = roleData?.map((r) => r.role) || [];
      const isAdmin = roles.some((r) => ["admin", "pastor_geral", "pastor_auxiliar"].includes(r));

      // Verificar se tem função de liderança na member_functions
      const { data: memberData } = await supabase
        .from("members")
        .select("id, member_functions(function_type)")
        .eq("user_id", userId)
        .maybeSingle();

      const functions: string[] = [];
      if (memberData?.member_functions) {
        memberData.member_functions.forEach((fn: { function_type: string }) => {
          functions.push(fn.function_type);
        });
      }

      const hasLeaderFunction = functions.some((fn) => LEADER_FUNCTION_TYPES.includes(fn));

      return {
        isAdmin,
        isLeader: isAdmin || hasLeaderFunction,
        roles,
        functions,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    isLeader: data?.isLeader ?? false,
    roles: data?.roles ?? [],
    functions: data?.functions ?? [],
    loading: isLoading,
  };
};

// Função para verificar acesso do usuário após login (sem hook)
export const checkUserAccess = async (userId: string): Promise<Omit<UserAccess, "loading">> => {
  // Verificar se é admin na tabela user_roles
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = roleData?.map((r) => r.role) || [];
  const isAdmin = roles.some((r) => ["admin", "pastor_geral", "pastor_auxiliar"].includes(r));

  // Verificar se tem função de liderança na member_functions
  const { data: memberData } = await supabase
    .from("members")
    .select("id, member_functions(function_type)")
    .eq("user_id", userId)
    .maybeSingle();

  const functions: string[] = [];
  if (memberData?.member_functions) {
    memberData.member_functions.forEach((fn: { function_type: string }) => {
      functions.push(fn.function_type);
    });
  }

  const hasLeaderFunction = functions.some((fn) => LEADER_FUNCTION_TYPES.includes(fn));

  return {
    isAdmin,
    isLeader: isAdmin || hasLeaderFunction,
    roles,
    functions,
  };
};
