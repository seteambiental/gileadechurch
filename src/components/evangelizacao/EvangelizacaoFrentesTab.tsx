import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Edit2, Trash2, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FrenteFormDialog } from "./FrenteFormDialog";
import { FrenteMembroDialog } from "./FrenteMembroDialog";
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

interface Frente {
  id: string;
  nome: string;
  descricao: string | null;
  lider_id: string | null;
  ativo: boolean;
  lider?: { full_name: string } | null;
}

interface FrenteMembro {
  id: string;
  frente_id: string;
  membro_id: string;
  funcao: string;
  member?: { full_name: string } | null;
}

export function EvangelizacaoFrentesTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMembroDialogOpen, setIsMembroDialogOpen] = useState(false);
  const [selectedFrente, setSelectedFrente] = useState<Frente | null>(null);
  const [frenteToDelete, setFrenteToDelete] = useState<Frente | null>(null);

  const { data: frentes, isLoading } = useQuery({
    queryKey: ["evangelizacao-frentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evangelizacao_frentes")
        .select("*, lider:lider_id(full_name)")
        .order("nome");
      if (error) throw error;
      return data as Frente[];
    },
  });

  const { data: membrosMap } = useQuery({
    queryKey: ["evangelizacao-frentes-membros"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evangelizacao_frentes_membros")
        .select("*, member:membro_id(full_name)");
      if (error) throw error;
      
      const map: Record<string, FrenteMembro[]> = {};
      (data as FrenteMembro[]).forEach((m) => {
        if (!map[m.frente_id]) map[m.frente_id] = [];
        map[m.frente_id].push(m);
      });
      return map;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evangelizacao_frentes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-frentes"] });
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-frentes-membros"] });
      toast.success("Frente excluída com sucesso!");
      setFrenteToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir frente");
    },
  });

  const handleEdit = (frente: Frente) => {
    setSelectedFrente(frente);
    setIsFormOpen(true);
  };

  const handleAddMembros = (frente: Frente) => {
    setSelectedFrente(frente);
    setIsMembroDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Frentes de Trabalho</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as frentes de evangelização
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedFrente(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Frente
        </Button>
      </div>

      {frentes?.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma frente de trabalho cadastrada
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar primeira frente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {frentes?.map((frente) => {
            const membros = membrosMap?.[frente.id] || [];
            return (
              <Card key={frente.id} className={!frente.ativo ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{frente.nome}</CardTitle>
                      {frente.lider && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Líder: {frente.lider.full_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={frente.ativo ? "default" : "secondary"}>
                      {frente.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {frente.descricao && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {frente.descricao}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{membros.length} membro(s)</span>
                  </div>

                  {membros.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {membros.slice(0, 3).map((m) => (
                        <Badge key={m.id} variant="outline" className="text-xs">
                          {m.member?.full_name?.split(" ")[0]}
                        </Badge>
                      ))}
                      {membros.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{membros.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddMembros(frente)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Membros
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(frente)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFrenteToDelete(frente)}
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

      <FrenteFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        frente={selectedFrente}
      />

      {selectedFrente && (
        <FrenteMembroDialog
          open={isMembroDialogOpen}
          onOpenChange={setIsMembroDialogOpen}
          frente={selectedFrente}
        />
      )}

      <AlertDialog open={!!frenteToDelete} onOpenChange={() => setFrenteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir frente de trabalho?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os membros vinculados serão desvinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => frenteToDelete && deleteMutation.mutate(frenteToDelete.id)}
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
