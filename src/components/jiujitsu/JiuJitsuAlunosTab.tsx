import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { ExportButton } from "@/components/ui/export-button";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, UserCheck, IdCard, FileText } from "lucide-react";
import { gerarTermoAlunoPDF } from "./gerarTermoAlunoPDF";
import { AlunoFormDialog } from "./AlunoFormDialog";
import { CarteirinhaDialog } from "./CarteirinhaDialog";
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

export function JiuJitsuAlunosTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<any>(null);
  const [deletingAluno, setDeletingAluno] = useState<any>(null);
  const [carteirinhaAluno, setCarteirinhaAluno] = useState<any>(null);

  // Column filters
  const [tipoFilter, setTipoFilter] = useState<Set<string>>(new Set());
  const [faixaFilter, setFaixaFilter] = useState<Set<string>>(new Set());

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["jiujitsu_alunos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jiujitsu_alunos")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      return (data || []) as any[];
    },
  });

  // Extract unique filter options
  const tipoOptions = useMemo(() => [...new Set(alunos.map((a: any) => a.tipo === "membro" ? "Membro" : "Visitante"))], [alunos]);
  const faixaOptions = useMemo(() => [...new Set(alunos.map((a: any) => a.faixa || "—"))], [alunos]);

  // Initialize filters
  useMemo(() => {
    if (tipoFilter.size === 0 && tipoOptions.length > 0) setTipoFilter(new Set(tipoOptions));
    if (faixaFilter.size === 0 && faixaOptions.length > 0) setFaixaFilter(new Set(faixaOptions));
  }, [tipoOptions, faixaOptions]);

  const filtered = useMemo(() => {
    return alunos.filter((a: any) => {
      if (search && !a.nome?.toLowerCase().includes(search.toLowerCase())) return false;
      const tipoLabel = a.tipo === "membro" ? "Membro" : "Visitante";
      if (tipoFilter.size > 0 && tipoFilter.size < tipoOptions.length && !tipoFilter.has(tipoLabel)) return false;
      const faixaLabel = a.faixa || "—";
      if (faixaFilter.size > 0 && faixaFilter.size < faixaOptions.length && !faixaFilter.has(faixaLabel)) return false;
      return true;
    });
  }, [alunos, search, tipoFilter, faixaFilter, tipoOptions.length, faixaOptions.length]);

  const handleDelete = async () => {
    if (!deletingAluno) return;
    const { error } = await supabase
      .from("jiujitsu_alunos")
      .update({ ativo: false })
      .eq("id", deletingAluno.id);
    if (!error) {
      toast({ title: "Aluno desativado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_alunos"] });
    } else {
      toast({ title: "Erro ao desativar aluno", variant: "destructive" });
    }
    setDeletingAluno(null);
  };

  const handleConverterMembro = async (aluno: any) => {
    const { error } = await supabase
      .from("jiujitsu_alunos")
      .update({ tipo: "membro" })
      .eq("id", aluno.id);
    if (!error) {
      toast({ title: `${aluno.nome} convertido em membro!` });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_alunos"] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <SearchInput
          placeholder="Buscar aluno..."
          value={search}
          onChange={setSearch}
          className="w-full sm:w-80"
        />
        <div className="flex gap-2">
          <ExportButton
            data={filtered}
            columns={[
              { header: "Nome", accessor: "nome" },
              { header: "Tipo", accessor: (r: any) => r.tipo === "membro" ? "Membro" : "Visitante" },
              { header: "Faixa", accessor: "faixa" },
              { header: "Graus", accessor: (r: any) => String(r.graus || 0) },
              { header: "Tipo Sanguíneo", accessor: (r: any) => r.tipo_sanguineo || "—" },
            ]}
            filename="jiujitsu-alunos"
            title="Alunos - Jiu-Jitsu"
            sheetName="Alunos"
          />
          <Button onClick={() => { setEditingAluno(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Aluno
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>
                <ColumnFilterPopover title="Tipo" options={tipoOptions} selected={tipoFilter} onChange={setTipoFilter} />
              </TableHead>
              <TableHead>
                <ColumnFilterPopover title="Faixa" options={faixaOptions} selected={faixaFilter} onChange={setFaixaFilter} />
              </TableHead>
              <TableHead>Graus</TableHead>
              <TableHead>Tipo Sanguíneo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell></TableRow>
            ) : (
              filtered.map((aluno: any) => (
                <TableRow key={aluno.id}>
                  <TableCell className="font-medium">{aluno.nome}</TableCell>
                  <TableCell>
                    <Badge variant={aluno.tipo === "membro" ? "default" : "secondary"}>
                      {aluno.tipo === "membro" ? "Membro" : "Visitante"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${FAIXA_COLORS[aluno.faixa] || ""}`}>
                      {aluno.faixa}
                    </span>
                  </TableCell>
                  <TableCell>{aluno.graus || 0}</TableCell>
                  <TableCell>{aluno.tipo_sanguineo || "—"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingAluno(aluno); setFormOpen(true); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCarteirinhaAluno(aluno)}>
                          <IdCard className="h-4 w-4 mr-2" /> Carteirinha
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => gerarTermoAlunoPDF(aluno)}>
                          <FileText className="h-4 w-4 mr-2" /> Gerar Termo PDF
                        </DropdownMenuItem>
                        {aluno.tipo === "visitante" && (
                          <DropdownMenuItem onClick={() => handleConverterMembro(aluno)}>
                            <UserCheck className="h-4 w-4 mr-2" /> Converter em Membro
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletingAluno(aluno)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Desativar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlunoFormDialog open={formOpen} onOpenChange={setFormOpen} aluno={editingAluno} />
      <CarteirinhaDialog open={!!carteirinhaAluno} onOpenChange={(o) => !o && setCarteirinhaAluno(null)} aluno={carteirinhaAluno} />

      <AlertDialog open={!!deletingAluno} onOpenChange={(o) => !o && setDeletingAluno(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              O aluno {deletingAluno?.nome} será desativado e não aparecerá mais nas listas.
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
