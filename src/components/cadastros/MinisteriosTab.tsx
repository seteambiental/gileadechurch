import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit2, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatLeaderNames } from "@/lib/text-utils";
import MinisterioFormDialog from "./MinisterioFormDialog";
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

interface Ministry {
  id: string;
  name: string;
  description: string | null;
  lider_id: string | null;
  lider_esposa_id: string | null;
  lider?: { full_name: string } | null;
  lider_esposa?: { full_name: string } | null;
}

const MinisteriosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ministry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select(`
          *,
          lider:members!ministries_lider_id_fkey(full_name),
          lider_esposa:members!ministries_lider_esposa_id_fkey(full_name)
        `)
        .order("name");
      if (error) throw error;
      return data as Ministry[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      toast({ title: "Ministério excluído com sucesso!" });
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir ministério", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; lider_id: string | null; lider_esposa_id: string | null }) => {
      if (editingItem) {
        const { error } = await supabase
          .from("ministries")
          .update(data)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ministries").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      toast({ title: editingItem ? "Ministério atualizado!" : "Ministério cadastrado!" });
      setIsFormOpen(false);
      setEditingItem(null);
    },
    onError: () => {
      toast({ title: "Erro ao salvar ministério", variant: "destructive" });
    },
  });

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lider?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formata o nome dos líderes para exibição nos cards
  const getLiderNomes = (item: Ministry) => {
    return formatLeaderNames(
      item.lider?.full_name,
      item.lider_esposa?.full_name
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ministérios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-secondary hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Ministério
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm ? "Nenhum ministério encontrado" : "Nenhum ministério cadastrado"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const liderNomes = getLiderNomes(item);
            return (
              <Card key={item.id} className="bg-card border-border hover:border-secondary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {liderNomes ? (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3 shrink-0" />
                          <span className="truncate">{liderNomes}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground/60 mt-1 flex items-center gap-1 italic">
                          <Users className="w-3 h-3 shrink-0" />
                          <span>Sem líder definido</span>
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <MinisterioFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        title={editingItem ? "Editar Ministério" : "Novo Ministério"}
        item={editingItem}
        onSave={(data) => saveMutation.mutate(data)}
        isSaving={saveMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ministério? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MinisteriosTab;
