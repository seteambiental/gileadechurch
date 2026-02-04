import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MemberPermission {
  id: string;
  function_type: string;
  ministry_id: string | null;
  casa_refugio_id: string | null;
  condominio_id: string | null;
  ministries?: { id: string; name: string; lider_whatsapp?: string | null } | null;
  casas_refugio?: { id: string; name: string; condominio?: string | null; supervisores?: string | null } | null;
  condominios?: { id: string; name: string } | null;
}

export interface MemberProfile {
  id: string;
  full_name: string;
  photo_url: string | null;
  email: string | null;
  whatsapp: string | null;
  user_id: string | null;
  member_functions: MemberPermission[];
}

export type PortalRole = 
  | "admin"
  | "pastor_geral" 
  | "pastor_auxiliar"
  | "lider_condominio"
  | "supervisor_casa_refugio"
  | "sindico_condominio" 
  | "supervisor_condominio" 
  | "lider_casa_refugio"
  | "lider_ministerio"
  | "integrante_ministerio"
  | "membro";

export interface PortalAccess {
  role: PortalRole;
  // Para casas refúgio
  casasRefugioIds?: string[];
  // Para supervisores
  supervisorCondominios?: string[];
  // Para síndicos
  sindicoCondominios?: string[];
  // Para ministérios
  ministerioIds?: string[];
  ministerioLiderIds?: string[];
}

export const useMemberPortal = () => {
  const { user } = useAuth();

  // Buscar perfil do membro logado
  const { data: memberProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["member-portal-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          photo_url,
          email,
          whatsapp,
          user_id,
          member_functions (
            id,
            function_type,
            ministry_id,
            casa_refugio_id,
            condominio_id,
            ministries (id, name, lider_whatsapp),
            casas_refugio (id, name, condominio, supervisores),
            condominios (id, name)
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as MemberProfile | null;
    },
    enabled: !!user?.id,
  });

  // Calcular nível de acesso
  const getPortalAccess = (): PortalAccess | null => {
    if (!memberProfile) return null;

    const functions = memberProfile.member_functions || [];
    
    // Verificar se é pastor geral ou pastor auxiliar (acesso total)
    const isPastorGeral = functions.some(f => f.function_type === "pastor_geral");
    if (isPastorGeral) {
      return { role: "pastor_geral" };
    }
    
    const isPastorAuxiliar = functions.some(f => f.function_type === "pastor_auxiliar");
    if (isPastorAuxiliar) {
      return { role: "pastor_auxiliar" };
    }

    // Verificar se é síndico de condomínio
    const sindicoFunctions = functions.filter(f => f.function_type === "sindico_condominio");
    if (sindicoFunctions.length > 0) {
      return {
        role: "sindico_condominio",
        sindicoCondominios: sindicoFunctions
          .filter(f => f.condominios?.name)
          .map(f => f.condominios!.name),
      };
    }

    // Verificar se é supervisor de condomínio
    const supervisorCondFunctions = functions.filter(f => f.function_type === "supervisor_condominio");
    if (supervisorCondFunctions.length > 0) {
      return {
        role: "supervisor_condominio",
        supervisorCondominios: supervisorCondFunctions
          .filter(f => f.condominios?.name)
          .map(f => f.condominios!.name),
      };
    }

    // Verificar se é supervisor de casa refúgio
    const supervisorCasaFunctions = functions.filter(f => f.function_type === "supervisor_casa_refugio");
    if (supervisorCasaFunctions.length > 0) {
      return {
        role: "supervisor_casa_refugio",
        casasRefugioIds: supervisorCasaFunctions
          .filter(f => f.casa_refugio_id)
          .map(f => f.casa_refugio_id!),
      };
    }

    // Verificar se é líder de casa refúgio
    const liderCasaFunctions = functions.filter(f => f.function_type === "lider_casa_refugio");
    if (liderCasaFunctions.length > 0) {
      return {
        role: "lider_casa_refugio",
        casasRefugioIds: liderCasaFunctions
          .filter(f => f.casa_refugio_id)
          .map(f => f.casa_refugio_id!),
      };
    }

    // Verificar se é líder de ministério
    const liderMinisterioFunctions = functions.filter(f => f.function_type === "lider_ministerio");
    if (liderMinisterioFunctions.length > 0) {
      return {
        role: "lider_ministerio",
        ministerioLiderIds: liderMinisterioFunctions
          .filter(f => f.ministry_id)
          .map(f => f.ministry_id!),
        ministerioIds: functions
          .filter(f => f.ministry_id)
          .map(f => f.ministry_id!),
      };
    }

    // Verificar se é integrante de ministério
    const integranteFunctions = functions.filter(f => f.function_type === "integrante_ministerio");
    if (integranteFunctions.length > 0) {
      return {
        role: "integrante_ministerio",
        ministerioIds: integranteFunctions
          .filter(f => f.ministry_id)
          .map(f => f.ministry_id!),
      };
    }

    // Membro comum
    return { role: "membro" };
  };

  // Obter ministérios do membro
  const getMemberMinistries = () => {
    if (!memberProfile) return [];
    
    const ministryMap = new Map<string, { id: string; name: string; isLider: boolean }>();
    
    memberProfile.member_functions?.forEach(fn => {
      if (fn.ministries) {
        const existing = ministryMap.get(fn.ministries.id);
        const isLider = fn.function_type === "lider_ministerio";
        
        if (!existing || isLider) {
          ministryMap.set(fn.ministries.id, {
            id: fn.ministries.id,
            name: fn.ministries.name,
            isLider: existing?.isLider || isLider,
          });
        }
      }
    });

    return Array.from(ministryMap.values());
  };

  // Obter casas refúgio do membro
  const getMemberCasasRefugio = () => {
    if (!memberProfile) return [];
    
    const casaMap = new Map<string, { id: string; name: string; isLider: boolean }>();
    
    memberProfile.member_functions?.forEach(fn => {
      if (fn.casas_refugio) {
        const existing = casaMap.get(fn.casas_refugio.id);
        const isLider = fn.function_type === "lider_casa_refugio";
        
        if (!existing || isLider) {
          casaMap.set(fn.casas_refugio.id, {
            id: fn.casas_refugio.id,
            name: fn.casas_refugio.name,
            isLider: existing?.isLider || isLider,
          });
        }
      }
    });

    return Array.from(casaMap.values());
  };

  return {
    memberProfile,
    loadingProfile,
    portalAccess: getPortalAccess(),
    memberMinistries: getMemberMinistries(),
    memberCasasRefugio: getMemberCasasRefugio(),
    isAuthenticated: !!user && !!memberProfile,
  };
};
