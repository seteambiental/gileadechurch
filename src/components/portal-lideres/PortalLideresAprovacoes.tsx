import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  CalendarIcon,
  MapPin,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
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
  const [rejectingEventoId, setRejectingEventoId] = useState<string | null>(null);
  const [motivoRejeicaoEvento, setMotivoRejeicaoEvento] = useState("");

  const canApproveEvents =
    portalAccess?.role === "pastor_geral" ||
    portalAccess?.role === "pastor_auxiliar" ||
    portalAccess?.role === "sindico_condominio" ||
    portalAccess?.role === "supervisor_condominio" ||
    portalAccess?.role === "supervisor_casa_refugio";

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

  // Buscar eventos pendentes de aprovação
  const { data: eventosPendentes = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["portal-aprovacoes-eventos", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*, solicitante:members!solicitante_id(full_name)")
        .eq("status", "pendente")
        .eq("ativo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId && canApproveEvents,
  });

  const tipoEventoLabels: Record<string, string> = {
    culto: "Culto",
    ceia: "Santa Ceia",
    batismo: "Batismo",
    impacto: "Impacto",
    retiro: "Retiro",
    conferencia: "Conferência",
    casa_refugio: "Casa Refúgio",
    gileade_fest: "Gileade Fest",
    retiro_kids: "Retiro Kids",
    evento: "Outro Evento",
  };

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

  // Aprovar evento
  const aprovarEventoMutation = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase
        .from("agenda_igreja")
        .update({ status: "aprovado" })
        .eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento aprovado!");
      queryClient.invalidateQueries({ queryKey: ["portal-aprovacoes-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-pendentes-lideres"] });
      queryClient.invalidateQueries({ queryKey: ["portal-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-igreja"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar evento: " + error.message);
    },
  });

  // Rejeitar evento
  const rejeitarEventoMutation = useMutation({
    mutationFn: async ({ eventoId, motivo }: { eventoId: string; motivo: string }) => {
      const { error } = await supabase
        .from("agenda_igreja")
        .update({ status: "rejeitado", motivo_rejeicao: motivo })
        .eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento rejeitado");
      setRejectingEventoId(null);
      setMotivoRejeicaoEvento("");
      queryClient.invalidateQueries({ queryKey: ["portal-aprovacoes-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-pendentes-lideres"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao rejeitar evento: " + error.message);
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

  const totalPendentes = mudancasPendentes.length + eventosPendentes.length;

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

      {/* Eventos pendentes de aprovação */}
      {canApproveEvents && eventosPendentes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-secondary" />
            Eventos Aguardando Aprovação ({eventosPendentes.length})
          </h3>
          {eventosPendentes.map((evento: any) => (
            <Card key={evento.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{evento.titulo}</h4>
                      <Badge variant="outline" className="text-xs">
                        {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {format(parseLocalDate(evento.data_evento), "dd/MM/yyyy")}
                      </span>
                      {evento.hora_inicio && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {evento.hora_inicio.substring(0, 5)}
                          {evento.hora_fim && ` - ${evento.hora_fim.substring(0, 5)}`}
                        </span>
                      )}
                      {evento.local && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {evento.local}
                        </span>
                      )}
                    </div>
                    {evento.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evento.descricao}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Solicitado por: <span className="font-medium">{evento.solicitante?.full_name || "—"}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setRejectingEventoId(evento.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => aprovarEventoMutation.mutate(evento.id)}
                      disabled={aprovarEventoMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mudanças pendentes */}
      {mudancasPendentes.length > 0 && (
        <div className="space-y-3">
          {eventosPendentes.length > 0 && (
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-secondary" />
              Solicitações de Mudanças ({mudancasPendentes.length})
            </h3>
          )}
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

      {/* Dialog de rejeição de evento */}
      <AlertDialog open={!!rejectingEventoId} onOpenChange={() => setRejectingEventoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para que o solicitante possa corrigir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={motivoRejeicaoEvento}
            onChange={(e) => setMotivoRejeicaoEvento(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectingEventoId) {
                  rejeitarEventoMutation.mutate({
                    eventoId: rejectingEventoId,
                    motivo: motivoRejeicaoEvento,
                  });
                }
              }}
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
