import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReservaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva?: any;
  solicitanteId?: string;
}

export const ReservaFormDialog = ({ open, onOpenChange, reserva, solicitanteId }: ReservaFormDialogProps) => {
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
  }, [reserva, open]);

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
      if (!reserva) payload.solicitante_id = solicitanteId || null;
      
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

  const valid = ambienteId && titulo.trim() && dataReserva && horaInicio && horaFim;

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
