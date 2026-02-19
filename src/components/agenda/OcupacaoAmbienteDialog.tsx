import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, DoorOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate, todayDateStr } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";

interface OcupacaoAmbienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambiente: any;
}

// Bloqueios fixos de cultos
const BLOQUEIOS_FIXOS = [
  { titulo: "Culto de Celebração", diaSemana: 0, horaInicio: "18:00", horaFim: "23:00", todosAmbientes: true },
  { titulo: "Culto de Ceia", diaSemana: 0, horaInicio: "18:00", horaFim: "23:00", todosAmbientes: true },
  { titulo: "Quarta com Propósito", diaSemana: 3, horaInicio: "19:00", horaFim: "23:00", todosAmbientes: false, ambienteNome: "Igreja" },
];

export const OcupacaoAmbienteDialog = ({ open, onOpenChange, ambiente }: OcupacaoAmbienteDialogProps) => {
  // Fetch reservas deste ambiente
  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ["ocupacao-ambiente", ambiente?.id],
    enabled: !!ambiente?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas_ambientes")
        .select("*, solicitante:members!solicitante_id(full_name)")
        .eq("ambiente_id", ambiente.id)
        .in("status", ["pendente", "aprovado"])
        .gte("data_reserva", todayDateStr())
        .order("data_reserva", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch agenda events blocking this ambiente
  const { data: agendaBloqueios = [], isLoading: loadingAgenda } = useQuery({
    queryKey: ["ocupacao-agenda", ambiente?.id],
    enabled: !!ambiente?.id && open,
    queryFn: async () => {
      const today = todayDateStr();
      // Direct ambiente_id references
      const { data: direct, error: e1 } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, tipo_evento, data_evento, hora_inicio, hora_fim, bloqueio_inicio, bloqueio_fim")
        .eq("ambiente_id", ambiente.id)
        .eq("ativo", true)
        .neq("status", "rejeitado")
        .gte("data_evento", today)
        .order("data_evento", { ascending: true })
        .limit(50);
      if (e1) throw e1;

      // Junction table references
      const { data: junction, error: e2 } = await supabase
        .from("agenda_ambientes")
        .select("agenda_id, bloqueio_inicio, bloqueio_fim, agenda:agenda_igreja(id, titulo, tipo_evento, data_evento, hora_inicio, hora_fim)")
        .eq("ambiente_id", ambiente.id)
        .limit(50);
      if (e2) throw e2;

      const junctionEvents = (junction || [])
        .filter((j: any) => j.agenda)
        .map((j: any) => ({
          ...j.agenda,
          bloqueio_inicio: j.bloqueio_inicio,
          bloqueio_fim: j.bloqueio_fim,
        }));

      // Merge and deduplicate
      const allEvents = [...(direct || []), ...junctionEvents];
      const seen = new Set<string>();
      return allEvents.filter((e: any) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    },
  });

  // Check if this ambiente gets fixed culto blocking
  const isIgreja = ambiente?.nome?.toLowerCase()?.includes("igreja");
  const bloqueiosAplicaveis = BLOQUEIOS_FIXOS.filter(b => b.todosAmbientes || (b.ambienteNome && isIgreja));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300 text-xs">Pendente</Badge>;
      case "aprovado": return <Badge variant="default" className="bg-green-600 text-xs">Aprovado</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5" />
            Ocupação — {ambiente?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bloqueios fixos */}
          {bloqueiosAplicaveis.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Bloqueios Fixos (Cultos)</h4>
              <div className="space-y-1.5">
                {bloqueiosAplicaveis.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-destructive/10 border border-destructive/20">
                    <CalendarIcon className="w-3.5 h-3.5 text-destructive" />
                    <span className="font-medium">{b.titulo}</span>
                    <span className="text-muted-foreground">
                      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][b.diaSemana]} {b.horaInicio}–{b.horaFim}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservas */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Reservas Ativas</h4>
            {loadingReservas ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : reservas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma reserva futura.</p>
            ) : (
              <div className="space-y-2">
                {reservas.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded border">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.titulo}</span>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(parseLocalDate(r.data_reserva), "dd/MM/yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {r.hora_inicio?.substring(0, 5)}–{r.hora_fim?.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agenda bloqueios */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Eventos da Agenda</h4>
            {loadingAgenda ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : agendaBloqueios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento futuro usando este ambiente.</p>
            ) : (
              <div className="space-y-2">
                {agendaBloqueios.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm p-2 rounded border border-blue-200 bg-blue-50/50">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{e.titulo}</span>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(parseLocalDate(e.data_evento), "dd/MM/yyyy")}
                        </span>
                        {e.hora_inicio && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {e.hora_inicio?.substring(0, 5)}–{e.hora_fim?.substring(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-blue-100">Agenda</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Export the fixed blocking rules for reuse in conflict checking
export const BLOQUEIOS_CULTOS = [
  { titulo: "Culto de Celebração / Ceia", diaSemana: 0, horaInicio: "18:00", horaFim: "23:00", todosAmbientes: true },
  { titulo: "Quarta com Propósito", diaSemana: 3, horaInicio: "19:00", horaFim: "23:00", todosAmbientes: false, ambienteNome: "Igreja" },
];
