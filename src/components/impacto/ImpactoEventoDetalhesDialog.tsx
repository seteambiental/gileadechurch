import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, Trash2, UserPlus } from "lucide-react";
import ImpactoDepartamentoFormDialog from "./ImpactoDepartamentoFormDialog";
import ImpactoMembroFormDialog from "./ImpactoMembroFormDialog";

const DEPARTAMENTOS = [
  { value: "logistica", label: "Logística" },
  { value: "correio", label: "Correio" },
  { value: "ministradores", label: "Ministradores" },
  { value: "apoio", label: "Apoio" },
  { value: "teatro", label: "Teatro" },
  { value: "cozinha", label: "Cozinha" },
  { value: "financeiro", label: "Financeiro" },
];

interface ImpactoEventoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: any;
}

const ImpactoEventoDetalhesDialog = ({ open, onOpenChange, evento }: ImpactoEventoDetalhesDialogProps) => {
  const queryClient = useQueryClient();
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [membroFormOpen, setMembroFormOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);

  const { data: departamentos } = useQuery({
    queryKey: ["impacto-departamentos", evento.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_departamentos")
        .select(`
          *,
          lider:members!impacto_departamentos_lider_id_fkey(id, full_name, photo_url)
        `)
        .eq("evento_id", evento.id)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: membrosEquipe } = useQuery({
    queryKey: ["impacto-equipe-membros", evento.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_equipe_membros")
        .select(`
          *,
          member:members(id, full_name, photo_url),
          departamento:impacto_departamentos(id, nome)
        `)
        .in("departamento_id", departamentos?.map((d) => d.id) || []);
      if (error) throw error;
      return data;
    },
    enabled: !!departamentos?.length,
  });

  const deleteDeptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impacto_departamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Departamento removido!");
      queryClient.invalidateQueries({ queryKey: ["impacto-departamentos", evento.id] });
    },
  });

  const deleteMembroMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impacto_equipe_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro removido!");
      queryClient.invalidateQueries({ queryKey: ["impacto-equipe-membros", evento.id] });
    },
  });

  const getMembrosForDept = (deptId: string) => {
    return membrosEquipe?.filter((m) => m.departamento_id === deptId) || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evento.titulo} - Escalas e Equipes</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
              {evento.data_fim && ` - ${format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`}
            </p>
            <Button size="sm" onClick={() => setDeptFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Departamento
            </Button>
          </div>

          {departamentos?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum departamento configurado. Adicione os departamentos para montar a escala.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {departamentos?.map((dept) => {
                const deptLabel = DEPARTAMENTOS.find((d) => d.value === dept.nome)?.label || dept.nome;
                const membros = getMembrosForDept(dept.id);

                return (
                  <Card key={dept.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{deptLabel}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedDeptId(dept.id);
                              setMembroFormOpen(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteDeptMutation.mutate(dept.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {dept.lider && (
                        <p className="text-sm text-muted-foreground">
                          Líder: <span className="font-medium">{dept.lider.full_name}</span>
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {membros.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Nenhum membro adicionado</p>
                      ) : (
                        <div className="space-y-2">
                          {membros.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-sm">
                              <div>
                                <span>{m.member?.full_name || m.nome_manual}</span>
                                {m.funcao && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {m.funcao}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMembroMutation.mutate(m.id)}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <ImpactoDepartamentoFormDialog
          open={deptFormOpen}
          onOpenChange={setDeptFormOpen}
          eventoId={evento.id}
        />

        {selectedDeptId && (
          <ImpactoMembroFormDialog
            open={membroFormOpen}
            onOpenChange={(open) => {
              setMembroFormOpen(open);
              if (!open) setSelectedDeptId(null);
            }}
            departamentoId={selectedDeptId}
            eventoId={evento.id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImpactoEventoDetalhesDialog;
