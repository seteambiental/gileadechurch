import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit2, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatLeaderNames } from "@/lib/text-utils";
import CondominioFormDialog from "./CondominioFormDialog";
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

interface Condominio {
  id: string;
  name: string;
  description: string | null;
  sindico_id: string | null;
  sindico_esposa_id: string | null;
  sindico?: {
    id: string;
    full_name: string;
  } | null;
  sindico_esposa?: {
    full_name: string;
  } | null;
}

const CondominiosTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Condominio | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["condominios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select(`
          *,
          sindico:members!condominios_sindico_id_fkey(id, full_name),
          sindico_esposa:members!condominios_sindico_esposa_id_fkey(full_name)
        `)
        .order("name");
      if (error) throw error;
      return data as Condominio[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("condominios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["condominios"] });
      toast({ title: "Condomínio excluído com sucesso!" });
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir condomínio", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; sindico_id: string | null; sindico_esposa_id: string | null }) => {
      if (editingItem) {
        const { error } = await supabase
          .from("condominios")
          .update(data)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("condominios").insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["condominios"] });
      toast({ title: editingItem ? "Condomínio atualizado!" : "Condomínio cadastrado!" });
      setIsFormOpen(false);
      setEditingItem(null);
    },
    onError: () => {
      toast({ title: "Erro ao salvar condomínio", variant: "destructive" });
    },
  });

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sindico?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const shouldShowDescription = (item: Condominio) => {
    const desc = (item.description ?? "").trim();
    if (!desc) return false;
    return desc.localeCompare(item.name.trim(), undefined, { sensitivity: "accent" }) !== 0;
  };

  // Formata o nome dos síndicos para exibição nos cards
  const getSindicoNomes = (item: Condominio) => {
    return formatLeaderNames(
      item.sindico?.full_name,
      item.sindico_esposa?.full_name,
      "Síndico"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar condomínios ou síndicos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="bg-secondary hover:bg-secondary/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Condomínio
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
            {searchTerm ? "Nenhum condomínio encontrado" : "Nenhum condomínio cadastrado"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="bg-card border-border hover:border-secondary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    {getSindicoNomes(item) ? (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{getSindicoNomes(item)}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/60 mt-1 flex items-center gap-1 italic">
                        <Users className="w-3 h-3" />
                        <span>Sem síndico definido</span>
                      </p>
                    )}
                    {shouldShowDescription(item) && (
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
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <CondominioFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        title={editingItem ? "Editar Condomínio" : "Novo Condomínio"}
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
              Tem certeza que deseja excluir este condomínio? Esta ação não pode ser desfeita.
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

export default CondominiosTab;
