import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Tipos de função (member_functions.function_type) que têm acesso ao portal de líderes
const LEADER_FUNCTION_TYPES = [
  "pastor_geral",
  "pastor_auxiliar",
  "sindico_condominio",
  "supervisor_condominio",
  "supervisor_casa_refugio",
  "lider_casa_refugio",
  "lider_ministerio",
  "integrante_ministerio",
];

// Roles (user_roles.role) que também indicam acesso de liderança
// Obs: em alguns fluxos do app, liderança é modelada como role e não como member_function.
const LEADER_ROLES = [
  "lider_ministerio",
  "integrante_ministerio",
  "lider_casa_refugio",
  "supervisor_casa_refugio",
  "lider_condominio",
  "sindico_condominio",
  "supervisor_condominio",
  "pastor_geral",
  "pastor_auxiliar",
];

export interface UserAccess {
  isAdmin: boolean;
  isLeader: boolean;
  isPastorAuxiliar: boolean;
  hasMemberProfile: boolean;
  roles: string[];
  functions: string[];
  hasLeaderAccess: boolean;
  pastorAuxiliarModules: string[];
  loading: boolean;
}

export const useUserAccess = (userId: string | undefined) => {
  const { data, isLoading } = useQuery({
    queryKey: ["user-access", userId],
    queryFn: async (): Promise<Omit<UserAccess, "loading">> => {
      if (!userId)
        return {
          isAdmin: false,
          isLeader: false,
          isPastorAuxiliar: false,
          hasMemberProfile: false,
          roles: [],
          functions: [],
          hasLeaderAccess: false,
          pastorAuxiliarModules: [],
        };

      // Verificar se é admin na tabela user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roles = roleData?.map((r) => r.role) || [];
      const isAdmin = roles.some((r) => ["admin", "pastor_geral"].includes(r));
      const isPastorAuxiliar = roles.includes("pastor_auxiliar");
      const hasLeaderRole = roles.some((r) => LEADER_ROLES.includes(r));

      // Verificar se tem função de liderança na member_functions
      const { data: memberRows } = await supabase
        .from("members")
        .select("id, member_functions(function_type)")
        .eq("user_id", userId);

      const functions: string[] = [];
      if (memberRows && memberRows.length > 0) {
        memberRows.forEach((member: any) => {
          if (member.member_functions) {
            member.member_functions.forEach((fn: { function_type: string }) => {
              if (!functions.includes(fn.function_type)) {
                functions.push(fn.function_type);
              }
            });
          }
        });
      }

      const hasMemberProfile = !!memberRows && memberRows.length > 0;
      const hasLeaderFunction = functions.some((fn) => LEADER_FUNCTION_TYPES.includes(fn));
      const hasLeaderAccess = hasLeaderRole || hasLeaderFunction;

      // Buscar módulos autorizados do pastor auxiliar
      let pastorAuxiliarModules: string[] = [];
      if (isPastorAuxiliar) {
        const { data: permData } = await supabase
          .from("pastor_auxiliar_permissoes")
          .select("modulo")
          .eq("user_id", userId)
          .eq("ativo", true);
        pastorAuxiliarModules = permData?.map((p) => p.modulo) || [];
      }

      return {
        isAdmin: isAdmin || isPastorAuxiliar,
        isLeader: hasLeaderAccess,
        isPastorAuxiliar,
        hasMemberProfile,
        roles,
        functions,
        hasLeaderAccess,
        pastorAuxiliarModules,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    isLeader: data?.isLeader ?? false,
    isPastorAuxiliar: data?.isPastorAuxiliar ?? false,
    hasMemberProfile: data?.hasMemberProfile ?? false,
    roles: data?.roles ?? [],
    functions: data?.functions ?? [],
    hasLeaderAccess: data?.hasLeaderAccess ?? false,
    pastorAuxiliarModules: data?.pastorAuxiliarModules ?? [],
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
  const isAdmin = roles.some((r) => ["admin", "pastor_geral"].includes(r));
  const isPastorAuxiliar = roles.includes("pastor_auxiliar");
  const hasLeaderRole = roles.some((r) => LEADER_ROLES.includes(r));

  // Verificar se tem função de liderança na member_functions
  const { data: memberRows } = await supabase
    .from("members")
    .select("id, member_functions(function_type)")
    .eq("user_id", userId);

  const functions: string[] = [];
  if (memberRows && memberRows.length > 0) {
    memberRows.forEach((member: any) => {
      if (member.member_functions) {
        member.member_functions.forEach((fn: { function_type: string }) => {
          if (!functions.includes(fn.function_type)) {
            functions.push(fn.function_type);
          }
        });
      }
    });
  }

  const hasMemberProfile = !!memberRows && memberRows.length > 0;
  const hasLeaderFunction = functions.some((fn) => LEADER_FUNCTION_TYPES.includes(fn));
  const hasLeaderAccess = hasLeaderRole || hasLeaderFunction;

  let pastorAuxiliarModules: string[] = [];
  if (isPastorAuxiliar) {
    const { data: permData } = await supabase
      .from("pastor_auxiliar_permissoes")
      .select("modulo")
      .eq("user_id", userId)
      .eq("ativo", true);
    pastorAuxiliarModules = permData?.map((p) => p.modulo) || [];
  }

  return {
    isAdmin: isAdmin || isPastorAuxiliar,
    isLeader: hasLeaderAccess,
    isPastorAuxiliar,
    hasMemberProfile,
    roles,
    functions,
    hasLeaderAccess,
    pastorAuxiliarModules,
  };
};
