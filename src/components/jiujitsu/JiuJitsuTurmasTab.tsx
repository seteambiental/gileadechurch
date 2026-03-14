import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
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

  const { data: turmas = [] } = useQuery({
    queryKey: ["jiujitsu_turmas_com_alunos"],
    queryFn: async () => {
      // Fetch turmas
      const { data: turmasData } = await supabase
        .from("jiujitsu_turmas")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (!turmasData) return [];

      // Fetch leader names
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

      // Fetch alunos per turma
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Turmas</h3>
        <Button onClick={() => { setEditingTurma(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Turma
        </Button>
      </div>

      {turmas.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">Nenhuma turma cadastrada. Crie a primeira turma!</p>
      )}

      {turmas.map((turma: any) => (
        <Card key={turma.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {turma.nome}
                  <Badge variant="secondary">{turma.categoria_idade}</Badge>
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
