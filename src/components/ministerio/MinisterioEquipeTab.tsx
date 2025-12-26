import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Filter, Settings, User } from "lucide-react";

interface MinisterioEquipeTabProps {
  ministryId: string;
  ministryName: string;
}

interface Funcao {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Integrante {
  id: string;
  member_id: string;
  funcao_id: string;
  ativo: boolean;
  member: {
    id: string;
    full_name: string;
    whatsapp: string | null;
    photo_url: string | null;
  };
  funcao: Funcao;
}

export const MinisterioEquipeTab = ({ ministryId, ministryName }: MinisterioEquipeTabProps) => {
  const queryClient = useQueryClient();
  const [filterFuncao, setFilterFuncao] = useState<string>("all");
  const [showFuncoesDialog, setShowFuncoesDialog] = useState(false);
  const [showAddIntegranteDialog, setShowAddIntegranteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingFuncao, setEditingFuncao] = useState<Funcao | null>(null);
  const [funcaoNome, setFuncaoNome] = useState("");
  const [funcaoDescricao, setFuncaoDescricao] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedFuncaoId, setSelectedFuncaoId] = useState("");
  const [integranteToDelete, setIntegranteToDelete] = useState<string | null>(null);
  const [funcaoToDelete, setFuncaoToDelete] = useState<string | null>(null);

  // Fetch funções do ministério
  const { data: funcoes = [] } = useQuery({
    queryKey: ["ministerio-funcoes", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_funcoes")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("nome");
      if (error) throw error;
      return data as Funcao[];
    },
  });

  // Fetch integrantes do ministério
  const { data: integrantes = [], isLoading } = useQuery({
    queryKey: ["ministerio-integrantes", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_integrantes")
        .select(`
          id,
          member_id,
          funcao_id,
          ativo,
          member:members(id, full_name, whatsapp, photo_url),
          funcao:ministerio_funcoes(id, nome, descricao)
        `)
        .eq("ministry_id", ministryId)
        .eq("ativo", true)
        .order("created_at");
      if (error) throw error;
      return data as unknown as Integrante[];
    },
  });

  // Fetch only members who selected this ministry in their registration
  const { data: membersInMinistry = [] } = useQuery({
    queryKey: ["members-for-ministry", ministryId],
    queryFn: async () => {
      // Get members who have this ministry in their member_functions
      const { data, error } = await supabase
        .from("member_functions")
        .select("member_id, member:members(id, full_name)")
        .eq("ministry_id", ministryId)
        .in("function_type", ["integrante_ministerio", "lider_ministerio"]);
      if (error) throw error;
      
      // Return unique members
      const uniqueMembers = new Map();
      data.forEach((item: any) => {
        if (item.member && !uniqueMembers.has(item.member.id)) {
          uniqueMembers.set(item.member.id, item.member);
        }
      });
      return Array.from(uniqueMembers.values()).sort((a, b) => 
        a.full_name.localeCompare(b.full_name)
      );
    },
  });

  // Filtered integrantes
  const filteredIntegrantes = useMemo(() => {
    return integrantes.filter((i) => {
      if (filterFuncao !== "all" && i.funcao_id !== filterFuncao) return false;
      return true;
    });
  }, [integrantes, filterFuncao]);

  // Mutation para criar/editar função
  const saveFuncaoMutation = useMutation({
    mutationFn: async () => {
      if (editingFuncao) {
        const { error } = await supabase
          .from("ministerio_funcoes")
          .update({ nome: funcaoNome, descricao: funcaoDescricao || null })
          .eq("id", editingFuncao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ministerio_funcoes")
          .insert({ ministry_id: ministryId, nome: funcaoNome, descricao: funcaoDescricao || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-funcoes", ministryId] });
      toast.success(editingFuncao ? "Função atualizada!" : "Função criada!");
      setEditingFuncao(null);
      setFuncaoNome("");
      setFuncaoDescricao("");
    },
    onError: () => toast.error("Erro ao salvar função"),
  });

  // Mutation para deletar função
  const deleteFuncaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministerio_funcoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-funcoes", ministryId] });
      toast.success("Função removida!");
      setFuncaoToDelete(null);
    },
    onError: () => toast.error("Erro ao remover função. Verifique se não há integrantes vinculados."),
  });

  // Mutation para adicionar integrante
  const addIntegranteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ministerio_integrantes").insert({
        ministry_id: ministryId,
        member_id: selectedMemberId,
        funcao_id: selectedFuncaoId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-integrantes", ministryId] });
      toast.success("Integrante adicionado!");
      setShowAddIntegranteDialog(false);
      setSelectedMemberId("");
      setSelectedFuncaoId("");
    },
    onError: () => toast.error("Erro ao adicionar integrante. Verifique se já não está cadastrado."),
  });

  // Mutation para remover integrante
  const removeIntegranteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministerio_integrantes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-integrantes", ministryId] });
      toast.success("Integrante removido!");
      setIntegranteToDelete(null);
      setShowDeleteDialog(false);
    },
    onError: () => toast.error("Erro ao remover integrante"),
  });

  const handleEditFuncao = (funcao: Funcao) => {
    setEditingFuncao(funcao);
    setFuncaoNome(funcao.nome);
    setFuncaoDescricao(funcao.descricao || "");
  };

  return (
    <div className="space-y-4">
      {/* Header com filtros e ações */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterFuncao} onValueChange={setFilterFuncao}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as funções" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {funcoes.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFuncoesDialog(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Funções
          </Button>
          <Button size="sm" onClick={() => setShowAddIntegranteDialog(true)} disabled={funcoes.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {funcoes.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Configure as funções do ministério primeiro clicando em "Funções"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de integrantes */}
      {isLoading ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : filteredIntegrantes.length === 0 && funcoes.length > 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum integrante encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <Badge variant="secondary" className="mb-2">
            {filteredIntegrantes.length} integrante(s)
          </Badge>
          {filteredIntegrantes.map((integrante) => (
            <Card key={integrante.id} className="bg-card hover:bg-muted/30 transition-colors">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {integrante.member?.photo_url ? (
                    <img
                      src={integrante.member.photo_url}
                      alt={integrante.member?.full_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">{integrante.member?.full_name}</p>
                    <Badge variant="outline" className="text-xs">
                      {integrante.funcao?.nome}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setIntegranteToDelete(integrante.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Funções */}
      <Dialog open={showFuncoesDialog} onOpenChange={setShowFuncoesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Funções do {ministryName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da função</Label>
              <Input
                value={funcaoNome}
                onChange={(e) => setFuncaoNome(e.target.value)}
                placeholder="Ex: Vocal, Câmera, Bailarina..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={funcaoDescricao}
                onChange={(e) => setFuncaoDescricao(e.target.value)}
                placeholder="Descrição da função"
              />
            </div>
            <Button
              onClick={() => saveFuncaoMutation.mutate()}
              disabled={!funcaoNome.trim() || saveFuncaoMutation.isPending}
              className="w-full"
            >
              {editingFuncao ? "Atualizar" : "Adicionar"} Função
            </Button>

            {funcoes.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Funções existentes:</p>
                {funcoes.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-muted/30 rounded p-2">
                    <div>
                      <p className="font-medium text-sm">{f.nome}</p>
                      {f.descricao && <p className="text-xs text-muted-foreground">{f.descricao}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditFuncao(f)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setFuncaoToDelete(f.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Integrante */}
      <Dialog open={showAddIntegranteDialog} onOpenChange={setShowAddIntegranteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Integrante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membro</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {membersInMinistry.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Nenhum membro selecionou este ministério no cadastro
                    </div>
                  ) : (
                    membersInMinistry.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={selectedFuncaoId} onValueChange={setSelectedFuncaoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  {funcoes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIntegranteDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addIntegranteMutation.mutate()}
              disabled={!selectedMemberId || !selectedFuncaoId || addIntegranteMutation.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Deletar Integrante */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover integrante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => integranteToDelete && removeIntegranteMutation.mutate(integranteToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Deletar Função */}
      <AlertDialog open={!!funcaoToDelete} onOpenChange={(open) => !open && setFuncaoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover função?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Certifique-se de que não há integrantes com essa função.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => funcaoToDelete && deleteFuncaoMutation.mutate(funcaoToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
