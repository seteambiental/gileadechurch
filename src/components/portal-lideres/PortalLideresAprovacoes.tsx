import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  Loader2,
  Check,
  X,
  Clock,
  User,
  Home,
  Building2,
  HandHeart,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface PortalLideresAprovacoesProps {
  portalAccess: PortalAccess | null;
  memberId: string;
}

export const PortalLideresAprovacoes = ({
  portalAccess,
  memberId,
}: PortalLideresAprovacoesProps) => {
  const queryClient = useQueryClient();

  // Buscar mudanças pendentes
  const { data: mudancasPendentes = [], isLoading } = useQuery({
    queryKey: ["portal-lideres-aprovacoes", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mudancas_pendentes")
        .select(`
          *,
          solicitante:members!mudancas_pendentes_solicitante_id_fkey(full_name),
          membro:members!mudancas_pendentes_membro_id_fkey(full_name),
          ministry:ministries!mudancas_pendentes_ministry_id_fkey(name),
          casa_refugio:casas_refugio!mudancas_pendentes_casa_refugio_id_fkey(name),
          condominio:condominios!mudancas_pendentes_condominio_id_fkey(name)
        `)
        .eq("aprovador_id", memberId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Mutation para aprovar mudança
  const aproveMutation = useMutation({
    mutationFn: async (mudancaId: string) => {
      const { error } = await supabase.functions.invoke("processar-aprovacao-mudanca", {
        body: { mudancaId, acao: "aprovar" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-lideres-aprovacoes"] });
      toast.success("Solicitação aprovada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao aprovar solicitação");
    },
  });

  // Mutation para rejeitar mudança
  const rejectMutation = useMutation({
    mutationFn: async (mudancaId: string) => {
      const { error } = await supabase.functions.invoke("processar-aprovacao-mudanca", {
        body: { mudancaId, acao: "rejeitar" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-lideres-aprovacoes"] });
      toast.success("Solicitação rejeitada!");
    },
    onError: () => {
      toast.error("Erro ao rejeitar solicitação");
    },
  });

  const getTipoIcon = (tipo: string) => {
    if (tipo.includes("ministerio")) return HandHeart;
    if (tipo.includes("casa_refugio")) return Home;
    if (tipo.includes("condominio")) return Building2;
    return User;
  };

  const getTipoLabel = (tipo: string): string => {
    const labels: Record<string, string> = {
      lideranca_ministerio: "Liderança de Ministério",
      integrante_ministerio: "Integrante de Ministério",
      lideranca_casa_refugio: "Liderança de Casa Refúgio",
      lideranca_condominio: "Liderança de Condomínio",
    };
    return labels[tipo] || tipo;
  };

  const getAcaoLabel = (acao: string): string => {
    const labels: Record<string, string> = {
      adicionar: "Adicionar",
      remover: "Remover",
      alterar: "Alterar",
    };
    return labels[acao] || acao;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  const totalPendentes = mudancasPendentes.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl">Aprovações Pendentes</h2>
          <p className="text-sm text-muted-foreground">
            {totalPendentes} solicitação(ões) aguardando sua aprovação
          </p>
        </div>
        {totalPendentes > 0 && (
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {totalPendentes}
          </Badge>
        )}
      </div>

      {/* Mudanças pendentes */}
      {mudancasPendentes.length > 0 && (
        <div className="space-y-3">
          {mudancasPendentes.map((mudanca) => {
            const Icon = getTipoIcon(mudanca.tipo_mudanca);
            return (
              <Card key={mudanca.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                        <Badge variant="secondary">
                          {getAcaoLabel(mudanca.acao)}
                        </Badge>
                      </div>
                      <h4 className="font-semibold">
                        {getTipoLabel(mudanca.tipo_mudanca)}
                      </h4>
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        {mudanca.membro?.full_name && (
                          <p>
                            <span className="font-medium">Membro:</span>{" "}
                            {mudanca.membro.full_name}
                          </p>
                        )}
                        {mudanca.ministry?.name && (
                          <p>
                            <span className="font-medium">Ministério:</span>{" "}
                            {mudanca.ministry.name}
                          </p>
                        )}
                        {mudanca.casa_refugio?.name && (
                          <p>
                            <span className="font-medium">Casa Refúgio:</span>{" "}
                            {mudanca.casa_refugio.name}
                          </p>
                        )}
                        {mudanca.condominio?.name && (
                          <p>
                            <span className="font-medium">Condomínio:</span>{" "}
                            {mudanca.condominio.name}
                          </p>
                        )}
                        <p className="text-xs">
                          Solicitado por: {mudanca.solicitante?.full_name || "—"} em{" "}
                          {format(new Date(mudanca.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => rejectMutation.mutate(mudanca.id)}
                        disabled={rejectMutation.isPending || aproveMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => aproveMutation.mutate(mudanca.id)}
                        disabled={aproveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPendentes === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma aprovação pendente</p>
            <p className="text-sm">
              Todas as solicitações foram processadas
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
