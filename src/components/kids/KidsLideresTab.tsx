import { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, UserCheck } from "lucide-react";

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
  { value: "auxiliar", label: "Auxiliar" },
];

export const KidsLideresTab = ({ turmasConfig }: KidsLideresTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedTurma, setSelectedTurma] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState("professor");

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
      toast({ title: "Líder adicionado com sucesso!" });
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
      toast({ title: "Líder removido" });
      queryClient.invalidateQueries({ queryKey: ["kids-lideres"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  // Agrupar líderes por turma
  const lideresPorTurma = turmasConfig.reduce((acc, turma) => {
    acc[turma.turma] = lideres?.filter((l) => l.turma === turma.turma) || [];
    return acc;
  }, {} as Record<string, typeof lideres>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Líderes e Professores
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os voluntários responsáveis por cada turma
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Líder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Líder ao Kids</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Membro</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {addLider.isPending ? "Adicionando..." : "Adicionar Líder"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards por turma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {turmasConfig.map((turma) => (
          <Card key={turma.turma} style={{ borderTopColor: turma.cor_hex, borderTopWidth: 4 }}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: turma.cor_hex }} 
                />
                Turma {turma.nome_exibicao}
                <Badge variant="secondary" className="ml-auto">
                  {lideresPorTurma[turma.turma]?.length || 0} líderes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lideresPorTurma[turma.turma]?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum líder cadastrado
                </p>
              ) : (
                <div className="space-y-2">
                  {lideresPorTurma[turma.turma]?.map((lider) => (
                    <div 
                      key={lider.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={lider.member?.photo_url || undefined} />
                          <AvatarFallback>
                            {lider.member?.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{lider.member?.full_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {FUNCOES.find((f) => f.value === lider.funcao)?.label}
                          </Badge>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
