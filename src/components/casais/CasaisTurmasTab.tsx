import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Eye, Lock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { TurmaFormDialog } from "./TurmaFormDialog";
import { TurmaDetalhesDialog } from "./TurmaDetalhesDialog";
import { ExportButton } from "@/components/ui/export-button";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";

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

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set());

  const getStatusLabel = (t: any) => t.ativo ? "Ativa" : "Encerrada";

  const columnOptions = useMemo(() => {
    if (!turmas) return { status: [] };
    return { status: [...new Set(turmas.map(getStatusLabel))].sort() };
  }, [turmas]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("casais_turmas").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir turma", variant: "destructive" });
    } else {
      toast({ title: "Turma excluída com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_turmas"] });
    }
    setDeleteId(null);
  };

  const handleToggleAtivo = async (turma: any) => {
    const { error } = await supabase
      .from("casais_turmas")
      .update({ ativo: !turma.ativo })
      .eq("id", turma.id);
    if (error) {
      toast({ title: "Erro ao atualizar turma", variant: "destructive" });
    } else {
      toast({ title: turma.ativo ? "Turma encerrada" : "Turma reativada" });
      queryClient.invalidateQueries({ queryKey: ["casais_turmas"] });
      queryClient.invalidateQueries({ queryKey: ["casais_financeiro_turmas"] });
    }
  };

  const filteredTurmas = useMemo(() => {
    if (!turmas) return [];
    return turmas.filter((t) => {
      if (!includesNormalized(t.nome, searchTerm)) return false;
      if (filterStatus.size > 0 && filterStatus.size < columnOptions.status.length && !filterStatus.has(getStatusLabel(t))) return false;
      return true;
    });
  }, [turmas, searchTerm, filterStatus, columnOptions]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading">Turmas do Curso</CardTitle>
          <div className="flex gap-2">
            <ExportButton
              data={filteredTurmas || []}
              columns={[
                { header: "Nome", accessor: "nome" },
                { header: "Horário", accessor: "horario" },
                { header: "Data Início", accessor: (r) => r.data_inicio ? format(parseLocalDate(r.data_inicio), "dd/MM/yyyy") : "-" },
                { header: "Data Fim", accessor: (r) => r.data_fim ? format(parseLocalDate(r.data_fim), "dd/MM/yyyy") : "-" },
                { header: "Casais", accessor: (r) => inscritosCount?.[r.id] || 0 },
                { header: "Vagas", accessor: (r) => r.vagas || "∞" },
                { header: "Status", accessor: (r) => r.ativo ? "Ativa" : "Encerrada" },
              ]}
              filename="turmas-casais"
              title="Turmas do Curso de Casais"
              sheetName="Turmas"
            />
            <Button onClick={() => { setSelectedTurma(null); setIsFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Turma
            </Button>
          </div>
        </div>
        <SearchInput
          placeholder="Buscar turmas..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="mt-4"
        />
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
                  <TableHead>
                    <ColumnFilterPopover title="Status" options={columnOptions.status} selected={filterStatus} onChange={setFilterStatus} />
                  </TableHead>
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
                          {format(parseLocalDate(turma.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                          {turma.data_fim && ` - ${format(parseLocalDate(turma.data_fim), "dd/MM/yyyy", { locale: ptBR })}`}
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
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant={turma.ativo ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleAtivo(turma)}
                          className="hidden sm:inline-flex"
                        >
                          {turma.ativo ? (
                            <><Lock className="w-4 h-4 mr-2" /> Encerrar</>
                          ) : (
                            <><RotateCcw className="w-4 h-4 mr-2" /> Reativar</>
                          )}
                        </Button>
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
                          <DropdownMenuItem onClick={() => handleToggleAtivo(turma)}>
                            {turma.ativo ? (
                              <><Lock className="w-4 h-4 mr-2" /> Encerrar turma</>
                            ) : (
                              <><RotateCcw className="w-4 h-4 mr-2" /> Reativar turma</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(turma.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
