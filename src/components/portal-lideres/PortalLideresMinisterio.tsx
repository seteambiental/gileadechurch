import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  Loader2,
  Music,
  BookOpen,
  Star,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Eye,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { AdicionarMembroMinisterioDialog } from "@/components/ministerio/AdicionarMembroMinisterioDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PortalLideresMinisterioProps {
  ministryId: string;
  ministryName: string;
  ministrySlug: string;
  isLider: boolean;
  canEdit: boolean;
  portalAccess: PortalAccess | null;
}

export const PortalLideresMinisterio = ({
  ministryId,
  ministryName,
  ministrySlug,
  isLider,
  canEdit,
  portalAccess,
}: PortalLideresMinisterioProps) => {
  const queryClient = useQueryClient();
  const [showAddMembro, setShowAddMembro] = useState(false);
  const [deletingMembroId, setDeletingMembroId] = useState<string | null>(null);

  // Buscar informações do ministério
  const { data: ministry, isLoading: loadingMinistry } = useQuery({
    queryKey: ["portal-lideres-ministry", ministryId],
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
    queryKey: ["portal-lideres-ministry-members", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_functions")
        .select(`
          id,
          function_type,
          subfuncao,
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

  // Buscar escalas futuras
  const { data: escalas = [] } = useQuery({
    queryKey: ["portal-lideres-ministry-escalas", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_escalas")
        .select("*")
        .eq("ministry_id", ministryId)
        .gte("data_culto", new Date().toISOString().split("T")[0])
        .order("data_culto")
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId,
  });

  // Mutation para remover membro
  const removeMutation = useMutation({
    mutationFn: async (membroFunctionId: string) => {
      const { error } = await supabase
        .from("member_functions")
        .delete()
        .eq("id", membroFunctionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-lideres-ministry-members", ministryId] });
      toast.success("Membro removido do ministério!");
      setDeletingMembroId(null);
    },
    onError: () => {
      toast.error("Erro ao remover membro");
    },
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">{ministryName}</h2>
            <div className="flex items-center gap-2">
              {isLider && <Badge variant="secondary">Líder</Badge>}
              {!canEdit && <Badge variant="outline">Visualização</Badge>}
              {ministry?.description && (
                <p className="text-sm text-muted-foreground">
                  {ministry.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {canEdit && (
          <Button onClick={() => setShowAddMembro(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Membro
          </Button>
        )}
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

      {/* Próximas Escalas */}
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
                        {escala.tipo_culto}
                      </p>
                    </div>
                    {canEdit && (
                      <Button variant="outline" size="sm">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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
          Equipe ({membros.length})
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
                  <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {functionTypeLabels[membro.function_type]}
                          </Badge>
                          {membro.subfuncao && (
                            <Badge variant="outline" className="text-xs">
                              {membro.subfuncao}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeletingMembroId(membro.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Integrantes */}
            {integrantes.map((membro) => (
              <Card key={membro.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {functionTypeLabels[membro.function_type]}
                          </span>
                          {membro.subfuncao && (
                            <Badge variant="outline" className="text-xs">
                              {membro.subfuncao}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeletingMembroId(membro.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para adicionar membro */}
      <AdicionarMembroMinisterioDialog
        open={showAddMembro}
        onOpenChange={setShowAddMembro}
        ministryId={ministryId}
        ministryName={ministryName}
        funcoes={[]}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["portal-lideres-ministry-members", ministryId] });
        }}
      />

      {/* Dialog de confirmação de remoção */}
      <AlertDialog open={!!deletingMembroId} onOpenChange={() => setDeletingMembroId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro do ministério?</AlertDialogTitle>
            <AlertDialogDescription>
              O membro será removido do ministério. Esta ação pode ser desfeita
              adicionando o membro novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMembroId && removeMutation.mutate(deletingMembroId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
