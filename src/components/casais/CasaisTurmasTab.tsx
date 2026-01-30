import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { includesNormalized } from "@/lib/text-utils";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { TurmaFormDialog } from "./TurmaFormDialog";
import { TurmaDetalhesDialog } from "./TurmaDetalhesDialog";

export function CasaisTurmasTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: turmas, isLoading } = useQuery({
    queryKey: ["casais_turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inscritosCount } = useQuery({
    queryKey: ["casais_inscritos_count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_inscritos")
        .select("turma_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((i) => {
        counts[i.turma_id] = (counts[i.turma_id] || 0) + 1;
      });
      return counts;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta turma?")) return;
    
    const { error } = await supabase.from("casais_turmas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir turma", variant: "destructive" });
    } else {
      toast({ title: "Turma excluída com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_turmas"] });
    }
  };

  const filteredTurmas = turmas?.filter((t) =>
    includesNormalized(t.nome, searchTerm)
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading">Turmas do Curso</CardTitle>
          <Button onClick={() => { setSelectedTurma(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Turma
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar turmas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredTurmas?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma turma cadastrada
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Período</TableHead>
                  <TableHead className="hidden md:table-cell">Casais</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTurmas?.map((turma) => (
                  <TableRow key={turma.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{turma.nome}</p>
                        {turma.horario && (
                          <p className="text-xs text-muted-foreground">{turma.horario}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {turma.data_inicio ? (
                        <span className="text-sm">
                          {format(new Date(turma.data_inicio + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          {turma.data_fim && ` - ${format(new Date(turma.data_fim + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}`}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{inscritosCount?.[turma.id] || 0} / {turma.vagas || "∞"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={turma.ativo ? "default" : "secondary"}>
                        {turma.ativo ? "Ativa" : "Encerrada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedTurma(turma); setIsDetalhesOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedTurma(turma); setIsFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(turma.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <TurmaFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        turma={selectedTurma}
      />

      <TurmaDetalhesDialog
        open={isDetalhesOpen}
        onOpenChange={setIsDetalhesOpen}
        turma={selectedTurma}
      />
    </Card>
  );
}
