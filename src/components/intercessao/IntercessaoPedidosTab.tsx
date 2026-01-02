import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, User, UserX, CheckCircle, Clock, Trash2 } from "lucide-react";
import PedidoOracaoFormDialog from "./PedidoOracaoFormDialog";
import TestemunhoFormDialog from "./TestemunhoFormDialog";

const IntercessaoPedidosTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [testemunhoFormOpen, setTestemunhoFormOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; pedidoId: string | null }>({
    open: false,
    pedidoId: null,
  });

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-oracao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_oracao")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("pedidos_oracao")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["pedidos-oracao"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pedidos_oracao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido removido!");
      queryClient.invalidateQueries({ queryKey: ["pedidos-oracao"] });
    },
    onError: () => {
      toast.error("Erro ao remover pedido");
    },
  });

  const handleMarkResponded = (pedidoId: string) => {
    setConfirmDialog({ open: true, pedidoId });
  };

  const handleConfirmResponded = (addTestemunho: boolean) => {
    if (confirmDialog.pedidoId) {
      updateStatusMutation.mutate({ id: confirmDialog.pedidoId, status: "respondido" });
      if (addTestemunho) {
        setTestemunhoFormOpen(true);
      }
    }
    setConfirmDialog({ open: false, pedidoId: null });
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-heading font-bold">Mural de Pedidos de Oração</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      {pedidos?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum pedido de oração registrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pedidos?.map((pedido) => (
            <Card key={pedido.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {pedido.anonimo ? (
                      <UserX className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">
                      {pedido.anonimo ? "Anônimo" : pedido.nome || "Não informado"}
                    </span>
                  </div>
                  <Badge variant={pedido.status === "respondido" ? "default" : "secondary"}>
                    {pedido.status === "respondido" ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Respondido</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" /> Aberto</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground">{pedido.pedido}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(pedido.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                
                {user && (
                  <div className="flex gap-2 pt-2">
                    {pedido.status === "aberto" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkResponded(pedido.id)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Marcar Respondido
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: pedido.id, status: "aberto" })}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Reabrir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(pedido.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PedidoOracaoFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <TestemunhoFormDialog open={testemunhoFormOpen} onOpenChange={setTestemunhoFormOpen} />

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, pedidoId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oração Respondida!</AlertDialogTitle>
            <AlertDialogDescription>
              A oração foi alcançada? Deseja compartilhar um testemunho sobre essa resposta de Deus?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setConfirmDialog({ open: false, pedidoId: null })}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleConfirmResponded(false)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Apenas Marcar
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleConfirmResponded(true)}>
              Sim, Compartilhar Testemunho
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IntercessaoPedidosTab;
