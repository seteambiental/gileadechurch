import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, UserCheck, Filter, Search } from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface KidsLideresTabProps {
  turmasConfig: TurmaConfig[];
}

const FUNCOES = [
  { value: "coordenador", label: "Coordenador(a)" },
  { value: "professor", label: "Professor(a)" },
  { value: "auxiliar", label: "Monitor(a)" },
];

export const KidsLideresTab = ({ turmasConfig }: KidsLideresTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedTurma, setSelectedTurma] = useState("todas");
  const [selectedFuncao, setSelectedFuncao] = useState("professor");
  const [memberSearch, setMemberSearch] = useState("");
  
  // Filtros
  const [filterTurma, setFilterTurma] = useState<string>("todas");
  const [filterFuncao, setFilterFuncao] = useState<string>("todas");

  // Buscar líderes
  const { data: lideres, isLoading } = useQuery({
    queryKey: ["kids-lideres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_lideres")
        .select(`
          *,
          member:members(id, full_name, photo_url, whatsapp)
        `)
        .eq("ativo", true)
        .order("turma");
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar membros para adicionar como líder
  const { data: members } = useQuery({
    queryKey: ["members-for-kids-leaders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, photo_url")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Filtrar líderes
  const filteredLideres = useMemo(() => {
    if (!lideres) return [];
    
    return lideres.filter((lider) => {
      const matchTurma = filterTurma === "todas" || lider.turma === filterTurma;
      const matchFuncao = filterFuncao === "todas" || lider.funcao === filterFuncao;
      return matchTurma && matchFuncao;
    });
  }, [lideres, filterTurma, filterFuncao]);

  // Adicionar líder
  const addLider = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("kids_lideres").insert({
        member_id: selectedMember,
        turma: selectedTurma as "laranja" | "amarelo" | "verde" | "azul",
        funcao: selectedFuncao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Membro adicionado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["kids-lideres"] });
      setIsDialogOpen(false);
      setSelectedMember("");
      setSelectedTurma("");
      setSelectedFuncao("professor");
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: error.message.includes("duplicate") 
          ? "Este membro já está cadastrado nesta turma" 
          : error.message 
      });
    },
  });

  // Remover líder
  const removeLider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kids_lideres")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Membro removido" });
      queryClient.invalidateQueries({ queryKey: ["kids-lideres"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Turma</Label>
                <Select value={filterTurma} onValueChange={setFilterTurma}>
                  <SelectTrigger className="w-[160px] h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as turmas</SelectItem>
                    {turmasConfig.map((t) => (
                      <SelectItem key={t.turma} value={t.turma}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: t.cor_hex }} 
                          />
                          {t.nome_exibicao}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Função</Label>
                <Select value={filterFuncao} onValueChange={setFilterFuncao}>
                  <SelectTrigger className="w-[160px] h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as funções</SelectItem>
                    {FUNCOES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header com botão */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Equipe Kids
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os voluntários responsáveis pelo ministério
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Membro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Membro</Label>
                <ClearableSelect
                  value={selectedMember || null}
                  onChange={(val) => setSelectedMember(val || "")}
                  options={(members || []).map((m) => ({
                    value: m.id,
                    label: m.full_name,
                  }))}
                  placeholder="Selecione um membro"
                  emptyLabel="Selecione..."
                />
              </div>

              <div>
                <Label>Turma</Label>
                <Select value={selectedTurma} onValueChange={setSelectedTurma}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {turmasConfig.map((t) => (
                      <SelectItem key={t.turma} value={t.turma}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: t.cor_hex }} 
                          />
                          {t.nome_exibicao} ({t.idade_minima}-{t.idade_maxima} anos)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Função</Label>
                <Select value={selectedFuncao} onValueChange={setSelectedFuncao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCOES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={() => addLider.mutate()}
                disabled={!selectedMember || !selectedTurma || addLider.isPending}
              >
                {addLider.isPending ? "Adicionando..." : "Adicionar à Equipe"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista sequencial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Membros da Equipe</span>
            <Badge variant="secondary">{filteredLideres.length} de {lideres?.length || 0} pessoas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredLideres.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {lideres?.length ? "Nenhum membro encontrado com os filtros selecionados" : "Nenhum membro cadastrado na equipe"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredLideres.map((lider) => {
                const turmaConfig = turmasConfig.find(t => t.turma === lider.turma);
                return (
                  <div 
                    key={lider.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={lider.member?.photo_url || undefined} />
                        <AvatarFallback>
                          {lider.member?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{lider.member?.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {FUNCOES.find((f) => f.value === lider.funcao)?.label}
                          </Badge>
                          {turmaConfig && (
                            <Badge 
                              className="text-xs text-white"
                              style={{ backgroundColor: turmaConfig.cor_hex }}
                            >
                              {turmaConfig.nome_exibicao}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLider.mutate(lider.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
