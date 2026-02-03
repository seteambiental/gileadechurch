import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Home,
  Users,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";

interface PortalLideresCondominioProps {
  portalAccess: PortalAccess | null;
  canEdit: boolean;
}

export const PortalLideresCondominio = ({
  portalAccess,
  canEdit,
}: PortalLideresCondominioProps) => {
  // Determinar condomínios que o usuário pode ver
  const getCondominioNames = () => {
    if (!portalAccess) return null;

    // Pastor geral/auxiliar vê tudo
    if (portalAccess.role === "pastor_geral" || portalAccess.role === "pastor_auxiliar") {
      return null;
    }

    // Síndico vê seus condomínios
    if (portalAccess.role === "sindico_condominio" && portalAccess.sindicoCondominios) {
      return portalAccess.sindicoCondominios;
    }

    return null;
  };

  const condominioNames = getCondominioNames();

  // Buscar condomínios
  const { data: condominios = [], isLoading } = useQuery({
    queryKey: ["portal-lideres-condominios", condominioNames],
    queryFn: async () => {
      let query = supabase
        .from("condominios")
        .select(`
          *,
          sindico:members!condominios_sindico_id_fkey(full_name),
          sindico_esposa:members!condominios_sindico_esposa_id_fkey(full_name)
        `)
        .order("name");

      if (condominioNames && condominioNames.length > 0) {
        query = query.in("name", condominioNames);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Buscar contagem de casas por condomínio
  const { data: casasCounts = {} } = useQuery({
    queryKey: ["portal-lideres-casas-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("condominio");

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((casa) => {
        if (casa.condominio) {
          counts[casa.condominio] = (counts[casa.condominio] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const getSindicoNome = (cond: any) => {
    const nomes = [];
    if (cond.sindico?.full_name) nomes.push(cond.sindico.full_name);
    if (cond.sindico_esposa?.full_name) nomes.push(cond.sindico_esposa.full_name);
    if (nomes.length > 0) return nomes.join(" e ");
    return "Não definido";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl">Condomínios</h2>
        <p className="text-sm text-muted-foreground">
          {condominios.length} condomínio(s)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {condominios.map((cond) => (
          <Card key={cond.id} className="hover:border-secondary transition-colors">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{cond.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Síndico: {getSindicoNome(cond)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Home className="w-4 h-4 text-muted-foreground" />
                  <span>{casasCounts[cond.name] || 0} casas</span>
                </div>
              </div>

              {cond.description && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {cond.description}
                </p>
              )}

              {canEdit && (
                <Badge variant="outline" className="mt-3">
                  Editar
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {condominios.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum condomínio encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
