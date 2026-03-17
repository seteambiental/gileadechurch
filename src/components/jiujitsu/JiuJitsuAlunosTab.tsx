import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, UserCheck, CreditCard, IdCard, FileText } from "lucide-react";
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

  const filtered = alunos.filter((a: any) =>
    a.nome?.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setEditingAluno(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Aluno
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Faixa</TableHead>
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

      <AlunoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        aluno={editingAluno}
      />

      <CarteirinhaDialog
        open={!!carteirinhaAluno}
        onOpenChange={(o) => !o && setCarteirinhaAluno(null)}
        aluno={carteirinhaAluno}
      />

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
