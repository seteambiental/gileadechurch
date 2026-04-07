import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ExportButton } from "@/components/ui/export-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, ChevronDown } from "lucide-react";
import { TurmaFormDialog } from "./TurmaFormDialog";
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

const FAIXA_COLORS: Record<string, string> = {
  Branca: "bg-gray-100 text-gray-800",
  Azul: "bg-blue-100 text-blue-800",
  Roxa: "bg-purple-100 text-purple-800",
  Marrom: "bg-amber-100 text-amber-800",
  Preta: "bg-gray-900 text-white",
};

export function JiuJitsuTurmasTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<any>(null);
  const [deletingTurma, setDeletingTurma] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Column filters
  const [categoriaFilter, setCategoriaFilter] = useState<Set<string>>(new Set());
  const [turmaFilter, setTurmaFilter] = useState<Set<string>>(new Set());

  const { data: turmas = [] } = useQuery({
    queryKey: ["jiujitsu_turmas_com_alunos"],
    queryFn: async () => {
      const { data: turmasData } = await supabase
        .from("jiujitsu_turmas")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (!turmasData) return [];

      const liderIds = turmasData.filter((t: any) => t.lider_id).map((t: any) => t.lider_id);
      let liderMap: Record<string, string> = {};
      if (liderIds.length > 0) {
        const { data: lideres } = await supabase
          .from("members_safe")
          .select("id, full_name")
          .in("id", liderIds);
        if (lideres) {
          liderMap = Object.fromEntries(lideres.map((l: any) => [l.id, l.full_name]));
        }
      }

      const { data: alunos } = await supabase
        .from("jiujitsu_alunos")
        .select("id, nome, faixa, graus, tipo, turma_id")
        .eq("ativo", true)
        .not("turma_id", "is", null);

      const alunosByTurma: Record<string, any[]> = {};
      for (const a of (alunos || [])) {
        if (!alunosByTurma[a.turma_id]) alunosByTurma[a.turma_id] = [];
        alunosByTurma[a.turma_id].push(a);
      }

      return turmasData.map((t: any) => ({
        ...t,
        lider_nome: liderMap[t.lider_id] || null,
        alunos: alunosByTurma[t.id] || [],
      }));
    },
  });

  const categoriaOptions = useMemo(() => [...new Set(turmas.map((t: any) => t.categoria_idade))], [turmas]);
  const turmaOptions = useMemo(() => turmas.map((t: any) => t.nome as string), [turmas]);

  useMemo(() => {
    if (categoriaFilter.size === 0 && categoriaOptions.length > 0) setCategoriaFilter(new Set(categoriaOptions));
  }, [categoriaOptions]);

  useMemo(() => {
    if (turmaFilter.size === 0 && turmaOptions.length > 0) setTurmaFilter(new Set(turmaOptions));
  }, [turmaOptions]);

  const filtered = useMemo(() => {
    return turmas.filter((t: any) => {
      if (search && !t.nome?.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoriaFilter.size > 0 && categoriaFilter.size < categoriaOptions.length && !categoriaFilter.has(t.categoria_idade)) return false;
      if (turmaFilter.size > 0 && turmaFilter.size < turmaOptions.length && !turmaFilter.has(t.nome)) return false;
      return true;
    });
  }, [turmas, search, categoriaFilter, categoriaOptions.length, turmaFilter, turmaOptions.length]);

  // Flatten for export — one row per aluno, grouped by turma
  const exportData = useMemo(() => {
    const rows: any[] = [];
    filtered.forEach((t: any) => {
      if (t.alunos.length === 0) {
        rows.push({
          turma: t.nome,
          aluno: "—",
          faixa: "—",
          graus: "—",
          tipo: "—",
        });
      } else {
        t.alunos.forEach((a: any) => {
          rows.push({
            turma: t.nome,
            aluno: a.nome,
            faixa: a.faixa || "—",
            graus: a.graus != null ? String(a.graus) : "0",
            tipo: a.tipo === "membro" ? "Membro" : "Visitante",
          });
        });
      }
    });
    return rows;
  }, [filtered]);

  const handleDelete = async () => {
    if (!deletingTurma) return;
    const { error } = await supabase
      .from("jiujitsu_turmas")
      .update({ ativo: false })
      .eq("id", deletingTurma.id);
    if (!error) {
      toast({ title: "Turma desativada" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_turmas_com_alunos"] });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_turmas_ativas"] });
    }
    setDeletingTurma(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          placeholder="Buscar turma..."
          value={search}
          onChange={setSearch}
          className="w-full sm:w-64"
        />
        <div className="flex gap-2">
          <ExportButton
            data={exportData}
            columns={[
              { header: "Turma", accessor: "turma" },
              { header: "Aluno", accessor: "aluno" },
              { header: "Faixa", accessor: "faixa" },
              { header: "Graus", accessor: "graus" },
              { header: "Tipo", accessor: "tipo" },
            ]}
            filename="jiujitsu-turmas"
            title="Turmas - Jiu-Jitsu"
            sheetName="Turmas"
          />
          <Button onClick={() => { setEditingTurma(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Turma
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <ColumnFilterPopover title="Categoria" options={categoriaOptions} selected={categoriaFilter} onChange={setCategoriaFilter} />
        <ColumnFilterPopover title="Turma" options={turmaOptions} selected={turmaFilter} onChange={setTurmaFilter} />
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">Nenhuma turma encontrada.</p>
      )}

      {filtered.map((turma: any) => (
        <Card key={turma.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {turma.nome}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                  <span>Faixas: {turma.faixa_minima} → {turma.faixa_maxima}</span>
                  {turma.dia_semana && <span>• {turma.dia_semana} {turma.horario || ""}</span>}
                  {turma.lider_nome && <span>• Líder: {turma.lider_nome}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {turma.alunos.length}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingTurma(turma); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingTurma(turma)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Desativar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {turma.alunos.length > 0 && (
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Graus</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turma.alunos.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FAIXA_COLORS[a.faixa] || ""}`}>
                            {a.faixa}
                          </span>
                        </TableCell>
                        <TableCell>{a.graus || 0}</TableCell>
                        <TableCell>
                          <Badge variant={a.tipo === "membro" ? "default" : "secondary"}>
                            {a.tipo === "membro" ? "Membro" : "Visitante"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <TurmaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        turma={editingTurma}
      />

      <AlertDialog open={!!deletingTurma} onOpenChange={(o) => !o && setDeletingTurma(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma {deletingTurma?.nome} será desativada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
