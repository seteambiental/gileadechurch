import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns true only if the current user has the 'admin' or 'pastor_geral' role.
 * Leaders, pastores auxiliares, and other roles return false.
 */
export const useIsStrictAdmin = () => {
  const { user } = useAuth();

  const { data: isStrictAdmin = false } = useQuery({
    queryKey: ["is-strict-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .in("role", ["admin", "pastor_geral"]);
      return (data && data.length > 0) || false;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return isStrictAdmin;
};
