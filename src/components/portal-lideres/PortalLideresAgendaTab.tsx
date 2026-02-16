import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PortalAgendaTab } from "@/components/portal/PortalAgendaTab";
import { EventoFormDialog } from "@/components/agenda/EventoFormDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Clock,
  CalendarIcon,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
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
import type { PortalAccess } from "@/hooks/useMemberPortal";

interface PortalLideresAgendaTabProps {
  portalAccess: PortalAccess;
  memberId: string;
}

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

export const PortalLideresAgendaTab = ({
  portalAccess,
  memberId,
}: PortalLideresAgendaTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  // Roles que podem aprovar eventos
  const canApprove =
    portalAccess.role === "pastor_geral" ||
    portalAccess.role === "pastor_auxiliar" ||
    portalAccess.role === "sindico_condominio" ||
    portalAccess.role === "supervisor_condominio";

  // Buscar eventos pendentes
  const { data: eventosPendentes = [], isLoading: loadingPendentes } = useQuery({
    queryKey: ["eventos-pendentes-lideres"],
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
  });

  // Buscar meus eventos solicitados
  const { data: meusEventos = [] } = useQuery({
    queryKey: ["meus-eventos-solicitados", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("solicitante_id", memberId)
        .eq("ativo", true)
        .in("status", ["pendente", "rejeitado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Aprovar evento
  const aprovarMutation = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase
        .from("agenda_igreja")
        .update({ status: "aprovado" })
        .eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Evento aprovado!" });
      queryClient.invalidateQueries({ queryKey: ["eventos-pendentes-lideres"] });
      queryClient.invalidateQueries({ queryKey: ["portal-agenda"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-igreja"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao aprovar", description: error.message });
    },
  });

  // Rejeitar evento
  const rejeitarMutation = useMutation({
    mutationFn: async ({ eventoId, motivo }: { eventoId: string; motivo: string }) => {
      const { error } = await supabase
        .from("agenda_igreja")
        .update({ status: "rejeitado", motivo_rejeicao: motivo })
        .eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Evento rejeitado" });
      setRejectingId(null);
      setMotivoRejeicao("");
      queryClient.invalidateQueries({ queryKey: ["eventos-pendentes-lideres"] });
      queryClient.invalidateQueries({ queryKey: ["meus-eventos-solicitados"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro ao rejeitar", description: error.message });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">Pendente</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      case "aprovado":
        return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Botão Criar Agenda */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl">Programação</h2>
          <p className="text-sm text-muted-foreground">
            Agenda da igreja e criação de eventos
          </p>
        </div>
        <Button onClick={() => setShowEventoForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Criar Agenda
        </Button>
      </div>

      {/* Eventos Pendentes de Aprovação (para aprovadores) */}
      {canApprove && eventosPendentes.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <h3 className="font-heading font-bold text-lg">
                Eventos Aguardando Aprovação ({eventosPendentes.length})
              </h3>
            </div>

            <div className="space-y-3">
              {eventosPendentes.map((evento: any) => (
                <Card key={evento.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-foreground">{evento.titulo}</h4>
                          <Badge variant="outline" className="text-xs">
                            {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                          </Badge>
                          {evento.visibilidade && (
                            <Badge variant="secondary" className="text-xs">
                              {evento.visibilidade === "publico" ? "Público" : evento.visibilidade === "interno" ? "Interno" : "Casa Refúgio"}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {format(parseISO(evento.data_evento), "dd/MM/yyyy")}
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
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {evento.descricao}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado por: <span className="font-medium">{evento.solicitante?.full_name || "—"}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 gap-1"
                          onClick={() => aprovarMutation.mutate(evento.id)}
                          disabled={aprovarMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => setRejectingId(evento.id)}
                        >
                          <X className="w-4 h-4" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meus eventos solicitados (pendentes/rejeitados) */}
      {meusEventos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-heading font-bold text-lg mb-3">
              Minhas Solicitações de Eventos
            </h3>
            <div className="space-y-2">
              {meusEventos.map((evento: any) => (
                <div
                  key={evento.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{evento.titulo}</span>
                      {getStatusBadge(evento.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(evento.data_evento), "dd/MM/yyyy")}
                    </p>
                    {evento.status === "rejeitado" && evento.motivo_rejeicao && (
                      <p className="text-sm text-destructive mt-1">
                        Motivo: {evento.motivo_rejeicao}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agenda normal (somente eventos aprovados) */}
      <PortalAgendaTab incluirSomenteConvidados />

      {/* Dialog de criação de evento (modo aprovação) */}
      <EventoFormDialog
        open={showEventoForm}
        onOpenChange={setShowEventoForm}
        mode="evento"
        approvalMode
        solicitanteId={memberId}
      />

      {/* Dialog de rejeição */}
      <AlertDialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição para que o solicitante possa corrigir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (rejectingId) {
                  rejeitarMutation.mutate({
                    eventoId: rejectingId,
                    motivo: motivoRejeicao,
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
