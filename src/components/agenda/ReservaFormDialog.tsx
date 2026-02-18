import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BLOQUEIOS_CULTOS } from "./OcupacaoAmbienteDialog";

interface ReservaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva?: any;
  solicitanteId?: string;
  isMaster?: boolean;
}

export const ReservaFormDialog = ({ open, onOpenChange, reserva, solicitanteId, isMaster }: ReservaFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [ambienteId, setAmbienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataReserva, setDataReserva] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState("");
  const [dataFimRecorrencia, setDataFimRecorrencia] = useState("");
  const [conflito, setConflito] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const { data: ambientes = [] } = useQuery({
    queryKey: ["ambientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ambientes").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (reserva) {
      setAmbienteId(reserva.ambiente_id || "");
      setTitulo(reserva.titulo || "");
      setDescricao(reserva.descricao || "");
      setDataReserva(reserva.data_reserva || "");
      setHoraInicio(reserva.hora_inicio?.substring(0, 5) || "");
      setHoraFim(reserva.hora_fim?.substring(0, 5) || "");
      setRecorrente(reserva.recorrente || false);
      setTipoRecorrencia(reserva.tipo_recorrencia || "");
      setDataFimRecorrencia(reserva.data_fim_recorrencia || "");
    } else {
      setAmbienteId(""); setTitulo(""); setDescricao(""); setDataReserva(""); 
      setHoraInicio(""); setHoraFim(""); setRecorrente(false); setTipoRecorrencia(""); setDataFimRecorrencia("");
    }
    setConflito(null);
  }, [reserva, open]);

  // Check conflicts whenever ambiente, date, or time changes
  useEffect(() => {
    if (!ambienteId || !dataReserva || !horaInicio || !horaFim) {
      setConflito(null);
      return;
    }
    checkConflicts();
  }, [ambienteId, dataReserva, horaInicio, horaFim]);

  const checkConflicts = async () => {
    if (!ambienteId || !dataReserva || !horaInicio || !horaFim) return;
    
    setCheckingConflict(true);
    setConflito(null);

    try {
      const ambienteNome = ambientes.find((a: any) => a.id === ambienteId)?.nome || "";

      // 1. Check fixed culto blocks
      const date = new Date(dataReserva + "T12:00:00");
      const diaSemana = date.getDay();
      
      for (const bloqueio of BLOQUEIOS_CULTOS) {
        const aplica = bloqueio.todosAmbientes || 
          (bloqueio.ambienteNome && ambienteNome.toLowerCase().includes(bloqueio.ambienteNome.toLowerCase()));
        
        if (aplica && bloqueio.diaSemana === diaSemana) {
          // Check time overlap
          if (horaInicio < bloqueio.horaFim && horaFim > bloqueio.horaInicio) {
            setConflito(`Conflito com ${bloqueio.titulo}: ${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][bloqueio.diaSemana]} ${bloqueio.horaInicio}–${bloqueio.horaFim}. Todos os ambientes ficam bloqueados neste horário.`);
            setCheckingConflict(false);
            return;
          }
        }
      }

      // 2. Check existing reservations
      const { data: existingReservas } = await supabase
        .from("reservas_ambientes")
        .select("id, titulo, hora_inicio, hora_fim")
        .eq("ambiente_id", ambienteId)
        .eq("data_reserva", dataReserva)
        .in("status", ["pendente", "aprovado"])
        .neq("id", reserva?.id || "00000000-0000-0000-0000-000000000000");

      if (existingReservas && existingReservas.length > 0) {
        for (const r of existingReservas) {
          const rInicio = r.hora_inicio?.substring(0, 5) || "";
          const rFim = r.hora_fim?.substring(0, 5) || "";
          if (horaInicio < rFim && horaFim > rInicio) {
            setConflito(`Conflito com reserva "${r.titulo}" (${rInicio}–${rFim}).`);
            setCheckingConflict(false);
            return;
          }
        }
      }

      // 3. Check agenda events blocking this ambiente
      const { data: agendaEvents } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, bloqueio_inicio, bloqueio_fim")
        .eq("ambiente_id", ambienteId)
        .eq("ativo", true)
        .neq("status", "rejeitado")
        .not("bloqueio_inicio", "is", null)
        .not("bloqueio_fim", "is", null);

      if (agendaEvents) {
        const reservaInicio = new Date(`${dataReserva}T${horaInicio}:00`).getTime();
        const reservaFim = new Date(`${dataReserva}T${horaFim}:00`).getTime();
        
        for (const evt of agendaEvents) {
          const evtInicio = new Date(evt.bloqueio_inicio).getTime();
          const evtFim = new Date(evt.bloqueio_fim).getTime();
          if (reservaInicio < evtFim && reservaFim > evtInicio) {
            setConflito(`Conflito com evento "${evt.titulo}" na agenda.`);
            setCheckingConflict(false);
            return;
          }
        }
      }

      // 4. Check junction table agenda_ambientes
      const { data: junctionEvents } = await supabase
        .from("agenda_ambientes")
        .select("bloqueio_inicio, bloqueio_fim, agenda:agenda_igreja(titulo)")
        .eq("ambiente_id", ambienteId)
        .not("bloqueio_inicio", "is", null)
        .not("bloqueio_fim", "is", null);

      if (junctionEvents) {
        const reservaInicio = new Date(`${dataReserva}T${horaInicio}:00`).getTime();
        const reservaFim = new Date(`${dataReserva}T${horaFim}:00`).getTime();
        
        for (const j of junctionEvents) {
          const jInicio = new Date(j.bloqueio_inicio).getTime();
          const jFim = new Date(j.bloqueio_fim).getTime();
          if (reservaInicio < jFim && reservaFim > jInicio) {
            setConflito(`Conflito com evento "${(j as any).agenda?.titulo}" na agenda.`);
            setCheckingConflict(false);
            return;
          }
        }
      }

    } catch (err) {
      console.error("Erro ao verificar conflitos:", err);
    } finally {
      setCheckingConflict(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ambiente_id: ambienteId,
        titulo,
        descricao: descricao || null,
        data_reserva: dataReserva,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        recorrente,
        tipo_recorrencia: recorrente ? tipoRecorrencia : null,
        data_fim_recorrencia: recorrente && dataFimRecorrencia ? dataFimRecorrencia : null,
      };
      if (!reserva) {
        payload.solicitante_id = solicitanteId || null;
        if (isMaster) payload.status = "aprovado";
      }
      
      if (reserva?.id) {
        const { error } = await supabase.from("reservas_ambientes").update(payload).eq("id", reserva.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reservas_ambientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: reserva ? "Reserva atualizada!" : "Reserva solicitada!" });
      queryClient.invalidateQueries({ queryKey: ["reservas-ambientes"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const valid = ambienteId && titulo.trim() && dataReserva && horaInicio && horaFim && !conflito;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reserva ? "Editar Reserva" : "Nova Reserva"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Ambiente *</Label>
            <Select value={ambienteId} onValueChange={setAmbienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o ambiente" /></SelectTrigger>
              <SelectContent>
                {ambientes.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome} {a.capacidade ? `(${a.capacidade} pessoas)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título / Motivo *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Reunião de liderança" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} placeholder="Detalhes opcionais" />
          </div>
          <div>
            <Label>Data *</Label>
            <Input type="date" value={dataReserva} onChange={(e) => setDataReserva(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hora Início *</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <Label>Hora Fim *</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>

          {/* Conflict alert */}
          {checkingConflict && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando disponibilidade...
            </div>
          )}
          {conflito && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{conflito}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Switch checked={recorrente} onCheckedChange={setRecorrente} />
            <Label>Reserva recorrente</Label>
          </div>
          {recorrente && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Recorrência</Label>
                <Select value={tipoRecorrencia} onValueChange={setTipoRecorrencia}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Até quando</Label>
                <Input type="date" value={dataFimRecorrencia} onChange={(e) => setDataFimRecorrencia(e.target.value)} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {reserva ? "Salvar" : "Solicitar Reserva"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
