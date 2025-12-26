import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, User, Users, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DancaEquipesTabProps {
  ministryId: string;
}

interface Equipe {
  id: string;
  nome: string;
  descricao: string | null;
}

interface EquipeMembro {
  id: string;
  equipe_id: string;
  member_id: string;
  funcao: string;
  ativo: boolean;
  member: {
    id: string;
    full_name: string;
    photo_url: string | null;
    whatsapp: string | null;
  };
}

const EQUIPES_PADRAO = [
  { nome: "Adolescentes", descricao: "Equipe de dança para adolescentes" },
  { nome: "Kids", descricao: "Equipe de dança para crianças" },
  { nome: "Jovens/Adultos", descricao: "Equipe de dança para jovens e adultos (composta por 3 times)" },
];

export const DancaEquipesTab = ({ ministryId }: DancaEquipesTabProps) => {
  const queryClient = useQueryClient();
  const [selectedEquipe, setSelectedEquipe] = useState<string>("all");
  const [showAddEquipeDialog, setShowAddEquipeDialog] = useState(false);
  const [showAddMembroDialog, setShowAddMembroDialog] = useState(false);
  const [showDeleteMembroDialog, setShowDeleteMembroDialog] = useState(false);
  const [showDeleteEquipeDialog, setShowDeleteEquipeDialog] = useState(false);
  const [equipeForm, setEquipeForm] = useState({ nome: "", descricao: "" });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedEquipeId, setSelectedEquipeId] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState("integrante");
  const [membroToDelete, setMembroToDelete] = useState<string | null>(null);
  const [equipeToDelete, setEquipeToDelete] = useState<string | null>(null);

  // Fetch equipes do ministério de dança
  const { data: equipes = [], isLoading: loadingEquipes } = useQuery({
    queryKey: ["danca-equipes", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("danca_equipes")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("nome");
      if (error) throw error;
      return data as Equipe[];
    },
  });

  // Fetch membros das equipes
  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ["danca-equipe-membros", ministryId],
    queryFn: async () => {
      const equipeIds = equipes.map(e => e.id);
      if (equipeIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("danca_equipe_membros")
        .select(`
          id,
          equipe_id,
          member_id,
          funcao,
          ativo,
          member:members(id, full_name, photo_url, whatsapp)
        `)
        .in("equipe_id", equipeIds)
        .eq("ativo", true)
        .order("created_at");
      if (error) throw error;
      return data as unknown as EquipeMembro[];
    },
    enabled: equipes.length > 0,
  });

  // Fetch membros que selecionaram o ministério de Dança no cadastro
  const { data: membersInMinistry = [] } = useQuery({
    queryKey: ["members-for-danca", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_functions")
        .select("member_id, member:members(id, full_name)")
        .eq("ministry_id", ministryId)
        .in("function_type", ["integrante_ministerio", "lider_ministerio"]);
      if (error) throw error;
      
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

  // Agrupar membros por equipe
  const membrosByEquipe = useMemo(() => {
    const grouped: Record<string, EquipeMembro[]> = {};
    membros.forEach(m => {
      if (!grouped[m.equipe_id]) grouped[m.equipe_id] = [];
      grouped[m.equipe_id].push(m);
    });
    return grouped;
  }, [membros]);

  // Mutation para criar equipe
  const createEquipeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("danca_equipes")
        .insert({
          ministry_id: ministryId,
          nome: equipeForm.nome,
          descricao: equipeForm.descricao || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["danca-equipes", ministryId] });
      toast.success("Equipe criada!");
      setShowAddEquipeDialog(false);
      setEquipeForm({ nome: "", descricao: "" });
    },
    onError: () => toast.error("Erro ao criar equipe"),
  });

  // Mutation para deletar equipe
  const deleteEquipeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("danca_equipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["danca-equipes", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["danca-equipe-membros", ministryId] });
      toast.success("Equipe removida!");
      setEquipeToDelete(null);
      setShowDeleteEquipeDialog(false);
    },
    onError: () => toast.error("Erro ao remover equipe"),
  });

  // Mutation para adicionar membro à equipe
  const addMembroMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("danca_equipe_membros").insert({
        equipe_id: selectedEquipeId,
        member_id: selectedMemberId,
        funcao: selectedFuncao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["danca-equipe-membros", ministryId] });
      toast.success("Membro adicionado à equipe!");
      setShowAddMembroDialog(false);
      setSelectedMemberId("");
      setSelectedEquipeId("");
      setSelectedFuncao("integrante");
    },
    onError: () => toast.error("Erro ao adicionar membro. Verifique se já não está na equipe."),
  });

  // Mutation para remover membro da equipe
  const removeMembroMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("danca_equipe_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["danca-equipe-membros", ministryId] });
      toast.success("Membro removido da equipe!");
      setMembroToDelete(null);
      setShowDeleteMembroDialog(false);
    },
    onError: () => toast.error("Erro ao remover membro"),
  });

  const handleSelectEquipePadrao = (equipePadrao: typeof EQUIPES_PADRAO[0]) => {
    setEquipeForm({
      nome: equipePadrao.nome,
      descricao: equipePadrao.descricao,
    });
  };

  // Filtrar membros já adicionados
  const availableMembers = useMemo(() => {
    const addedMemberIds = new Set(membros.map(m => m.member_id));
    return membersInMinistry.filter(m => !addedMemberIds.has(m.id));
  }, [membersInMinistry, membros]);

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 items-center">
          <Users className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedEquipe} onValueChange={setSelectedEquipe}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as equipes</SelectItem>
              {equipes.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddEquipeDialog(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Nova Equipe
          </Button>
          <Button size="sm" onClick={() => setShowAddMembroDialog(true)} disabled={equipes.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Membro
          </Button>
        </div>
      </div>

      {/* Mensagem se não há equipes */}
      {equipes.length === 0 && !loadingEquipes && (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              Nenhuma equipe cadastrada. Crie as equipes para organizar os dançarinos.
            </p>
            <p className="text-sm text-muted-foreground">
              Sugestão: Adolescentes, Kids e Jovens/Adultos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de equipes e membros */}
      {loadingEquipes || loadingMembros ? (
        <p className="text-center text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {equipes
            .filter(e => selectedEquipe === "all" || e.id === selectedEquipe)
            .map((equipe) => {
              const equipeMembros = membrosByEquipe[equipe.id] || [];
              
              return (
                <Card key={equipe.id} className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-destructive" />
                          {equipe.nome}
                        </CardTitle>
                        {equipe.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{equipe.descricao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{equipeMembros.length} membro(s)</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setEquipeToDelete(equipe.id);
                            setShowDeleteEquipeDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {equipeMembros.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum membro nesta equipe
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {equipeMembros.map((membro) => (
                          <div
                            key={membro.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              {membro.member?.photo_url ? (
                                <img
                                  src={membro.member.photo_url}
                                  alt={membro.member?.full_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <User className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{membro.member?.full_name}</p>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {membro.funcao}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setMembroToDelete(membro.id);
                                setShowDeleteMembroDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Dialog Nova Equipe */}
      <Dialog open={showAddEquipeDialog} onOpenChange={setShowAddEquipeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Equipe de Dança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione uma categoria</Label>
              <div className="grid gap-2">
                {EQUIPES_PADRAO.map((ep) => (
                  <Button
                    key={ep.nome}
                    type="button"
                    variant={equipeForm.nome === ep.nome ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleSelectEquipePadrao(ep)}
                  >
                    {ep.nome}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome da Equipe</Label>
              <Input
                value={equipeForm.nome}
                onChange={(e) => setEquipeForm({ ...equipeForm, nome: e.target.value })}
                placeholder="Ex: Adolescentes, Kids, Jovens/Adultos..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={equipeForm.descricao}
                onChange={(e) => setEquipeForm({ ...equipeForm, descricao: e.target.value })}
                placeholder="Descrição da equipe"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEquipeDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createEquipeMutation.mutate()}
              disabled={!equipeForm.nome.trim() || createEquipeMutation.isPending}
            >
              Criar Equipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Membro */}
      <Dialog open={showAddMembroDialog} onOpenChange={setShowAddMembroDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={selectedEquipeId} onValueChange={setSelectedEquipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma equipe" />
                </SelectTrigger>
                <SelectContent>
                  {equipes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Membro</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      Nenhum membro disponível (já estão em equipes ou não selecionaram este ministério)
                    </div>
                  ) : (
                    availableMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={selectedFuncao} onValueChange={setSelectedFuncao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integrante">Integrante</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                  <SelectItem value="coreografo">Coreógrafo(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMembroDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addMembroMutation.mutate()}
              disabled={!selectedMemberId || !selectedEquipeId || addMembroMutation.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Deletar Membro */}
      <AlertDialog open={showDeleteMembroDialog} onOpenChange={setShowDeleteMembroDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => membroToDelete && removeMembroMutation.mutate(membroToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Deletar Equipe */}
      <AlertDialog open={showDeleteEquipeDialog} onOpenChange={setShowDeleteEquipeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover equipe?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os membros serão removidos da equipe. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => equipeToDelete && deleteEquipeMutation.mutate(equipeToDelete)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
