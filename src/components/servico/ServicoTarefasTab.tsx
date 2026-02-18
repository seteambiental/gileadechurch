import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle,
  Edit2,
  Trash2,
  UserPlus,
  Eye,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { TarefaFormDialog } from "./TarefaFormDialog";
import { TarefaVoluntariosDialog } from "./TarefaVoluntariosDialog";
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

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  data_tarefa: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  vagas_necessarias: number;
  status: string;
  criado_por: string | null;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aberta: { label: "Aberta", variant: "default" },
  em_andamento: { label: "Em Andamento", variant: "secondary" },
  concluida: { label: "Concluída", variant: "outline" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

export function ServicoTarefasTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVoluntariosOpen, setIsVoluntariosOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [tarefaToDelete, setTarefaToDelete] = useState<Tarefa | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["servico-tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servico_tarefas")
        .select("*")
        .order("data_tarefa", { ascending: true });
      if (error) throw error;
      return data as Tarefa[];
    },
  });

  const { data: voluntariosCount = {} } = useQuery({
    queryKey: ["servico-voluntarios-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servico_tarefa_voluntarios")
        .select("tarefa_id, status");
      if (error) throw error;
      
      const counts: Record<string, { confirmados: number; pendentes: number }> = {};
      (data || []).forEach((v: any) => {
        if (!counts[v.tarefa_id]) {
          counts[v.tarefa_id] = { confirmados: 0, pendentes: 0 };
        }
        if (v.status === "confirmado") {
          counts[v.tarefa_id].confirmados++;
        } else if (v.status === "pendente") {
          counts[v.tarefa_id].pendentes++;
        }
      });
      return counts;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("servico_tarefas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servico-tarefas"] });
      toast.success("Tarefa excluída!");
      setTarefaToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir tarefa");
    },
  });

  const tarefasFiltradas = tarefas.filter((t) => {
    if (filtroStatus === "todas") return true;
    return t.status === filtroStatus;
  });

  const handleEdit = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setIsFormOpen(true);
  };

  const handleVoluntarios = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setIsVoluntariosOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tarefas de Serviço</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as tarefas e solicite voluntários
          </p>
        </div>
        <Button onClick={() => { setSelectedTarefa(null); setIsFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {["todas", "aberta", "em_andamento", "concluida", "cancelada"].map((status) => (
          <Button
            key={status}
            variant={filtroStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltroStatus(status)}
          >
            {status === "todas" ? "Todas" : statusLabels[status]?.label}
          </Button>
        ))}
      </div>

      {tarefasFiltradas.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tarefasFiltradas.map((tarefa) => {
            const counts = voluntariosCount[tarefa.id] || { confirmados: 0, pendentes: 0 };
            const dataTarefa = parseLocalDate(tarefa.data_tarefa);
            const passado = isPast(dataTarefa) && tarefa.status !== "concluida";
            
            return (
              <Card 
                key={tarefa.id} 
                className={`${passado ? "opacity-60" : ""} ${tarefa.status === "cancelada" ? "opacity-50" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{tarefa.titulo}</CardTitle>
                    <Badge variant={statusLabels[tarefa.status]?.variant || "default"}>
                      {statusLabels[tarefa.status]?.label || tarefa.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(dataTarefa, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    </div>
                    {tarefa.hora_inicio && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {tarefa.hora_inicio.substring(0, 5)}
                          {tarefa.hora_fim && ` - ${tarefa.hora_fim.substring(0, 5)}`}
                        </span>
                      </div>
                    )}
                    {tarefa.local && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{tarefa.local}</span>
                      </div>
                    )}
                  </div>

                  {tarefa.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tarefa.descricao}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {tarefa.vagas_necessarias} vagas
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {counts.confirmados}
                      </span>
                      {counts.pendentes > 0 && (
                        <span className="text-yellow-600">
                          ({counts.pendentes} pendentes)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleVoluntarios(tarefa)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Voluntários
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tarefa)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTarefaToDelete(tarefa)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TarefaFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        tarefa={selectedTarefa}
      />

      {selectedTarefa && (
        <TarefaVoluntariosDialog
          open={isVoluntariosOpen}
          onOpenChange={setIsVoluntariosOpen}
          tarefa={selectedTarefa}
        />
      )}

      <AlertDialog open={!!tarefaToDelete} onOpenChange={() => setTarefaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os voluntários serão desvinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tarefaToDelete && deleteMutation.mutate(tarefaToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
