import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserCircle } from "lucide-react";

interface Frente {
  id: string;
  nome: string;
}

interface FrenteMembroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frente: Frente;
}

export function FrenteMembroDialog({ open, onOpenChange, frente }: FrenteMembroDialogProps) {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState("membro");

  const { data: membros, isLoading: loadingMembros } = useQuery({
    queryKey: ["evangelizacao-frentes-membros", frente.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evangelizacao_frentes_membros")
        .select("*, member:membro_id(id, full_name)")
        .eq("frente_id", frente.id);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: allMembers } = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("evangelizacao_frentes_membros")
        .insert({
          frente_id: frente.id,
          membro_id: selectedMemberId,
          funcao: selectedFuncao,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-frentes-membros"] });
      toast.success("Membro adicionado!");
      setSelectedMemberId("");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Este membro já está na frente");
      } else {
        toast.error("Erro ao adicionar membro");
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evangelizacao_frentes_membros")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-frentes-membros"] });
      toast.success("Membro removido!");
    },
    onError: () => {
      toast.error("Erro ao remover membro");
    },
  });

  const existingIds = membros?.map((m) => m.membro_id) || [];
  const availableMembers = allMembers?.filter((m) => !existingIds.includes(m.id)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Membros - {frente.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member form */}
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFuncao} onValueChange={setSelectedFuncao}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="lider">Líder</SelectItem>
                <SelectItem value="auxiliar">Auxiliar</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => addMutation.mutate()}
              disabled={!selectedMemberId || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Members list */}
          {loadingMembros ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : membros?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum membro vinculado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {membros?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{m.member?.full_name}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {m.funcao}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(m.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
