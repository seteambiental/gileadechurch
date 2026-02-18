import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Loader2, Music, BookOpen, Star } from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";

interface PortalMinisterioTabProps {
  ministryId: string;
  ministryName: string;
  ministrySlug: string;
  isLider: boolean;
  portalAccess: PortalAccess | null;
}

export const PortalMinisterioTab = ({
  ministryId,
  ministryName,
  ministrySlug,
  isLider,
  portalAccess,
}: PortalMinisterioTabProps) => {
  // Buscar informações do ministério
  const { data: ministry, isLoading: loadingMinistry } = useQuery({
    queryKey: ["portal-ministry", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("*")
        .eq("id", ministryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId,
  });

  // Buscar membros do ministério
  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ["portal-ministry-members", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_functions")
        .select(`
          id,
          function_type,
          members (
            id,
            full_name,
            photo_url,
            whatsapp
          )
        `)
        .eq("ministry_id", ministryId);
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId,
  });

  // Buscar escalas (se aplicável)
  const { data: escalas = [], isLoading: loadingEscalas } = useQuery({
    queryKey: ["portal-ministry-escalas", ministrySlug],
    queryFn: async () => {
      // Para Kids, buscar kids_escalas
      if (ministrySlug === "kids") {
        const { data, error } = await supabase
          .from("kids_escalas")
          .select(`
            *,
            lider:members!kids_escalas_lider_id_fkey (full_name)
          `)
          .gte("data_culto", new Date().toISOString().split("T")[0])
          .order("data_culto")
          .limit(5);
        if (error) throw error;
        return data;
      }

      // Para Dança, buscar escalas de dança
      if (ministrySlug === "danca") {
        // Escalas genéricas se houver uma tabela
        return [];
      }

      return [];
    },
    enabled: !!ministryId,
  });

  // Buscar materiais (se for ministério de casais)
  const { data: materiais = [] } = useQuery({
    queryKey: ["portal-ministry-materiais", ministrySlug],
    queryFn: async () => {
      if (ministrySlug === "casais") {
        const { data, error } = await supabase
          .from("casais_materiais")
          .select("*")
          .eq("ativo", true)
          .order("ordem");
        if (error) throw error;
        return data;
      }
      return [];
    },
    enabled: ministrySlug === "casais",
  });

  const functionTypeLabels: Record<string, string> = {
    lider_ministerio: "Líder",
    integrante_ministerio: "Integrante",
  };

  const getIcon = () => {
    switch (ministrySlug) {
      case "louvor":
        return Music;
      case "ensino":
        return BookOpen;
      default:
        return Star;
    }
  };

  const Icon = getIcon();

  if (loadingMinistry) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  const lideres = membros.filter((m) => m.function_type === "lider_ministerio");
  const integrantes = membros.filter((m) => m.function_type === "integrante_ministerio");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-xl">{ministryName}</h2>
          <div className="flex items-center gap-2">
            {isLider && <Badge variant="secondary">Líder</Badge>}
            {ministry?.description && (
              <p className="text-sm text-muted-foreground">
                {ministry.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{lideres.length}</p>
            <p className="text-xs text-muted-foreground">Líderes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{integrantes.length}</p>
            <p className="text-xs text-muted-foreground">Integrantes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{membros.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Escalas (se houver) */}
      {escalas.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Próximas Escalas
          </h3>
          <div className="space-y-2">
            {escalas.map((escala: any) => (
              <Card key={escala.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {format(parseLocalDate(escala.data_culto), "EEEE, dd/MM", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {escala.tipo_culto} - {escala.turma}
                      </p>
                    </div>
                    {escala.lider && (
                      <Badge variant="outline">{escala.lider.full_name}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Materiais (se houver) */}
      {materiais.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Materiais
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {materiais.map((material: any) => (
              <Card key={material.id} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium">{material.titulo}</h4>
                  {material.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {material.descricao}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {material.tipo}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Equipe */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Equipe
        </h3>
        {loadingMembros ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : membros.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum membro cadastrado
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {/* Líderes primeiro */}
            {lideres.map((membro) => (
              <Card key={membro.id} className="border-secondary/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    {membro.members?.photo_url ? (
                      <img
                        src={membro.members.photo_url}
                        alt={membro.members.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                        <span className="text-secondary font-bold">
                          {membro.members?.full_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{membro.members?.full_name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {functionTypeLabels[membro.function_type]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Integrantes */}
            {integrantes.map((membro) => (
              <Card key={membro.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    {membro.members?.photo_url ? (
                      <img
                        src={membro.members.photo_url}
                        alt={membro.members.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground font-bold">
                          {membro.members?.full_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{membro.members?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {functionTypeLabels[membro.function_type]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
