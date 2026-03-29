import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ExportButton } from "@/components/ui/export-button";
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Users } from "lucide-react";
import { ProfessorFormDialog } from "./ProfessorFormDialog";
import { includesNormalized } from "@/lib/text-utils";
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

const FAIXA_LABELS: Record<string, string> = {
  "6-9": "6 a 9 anos",
  "10-13": "10 a 13 anos",
  "14+": "14 anos acima",
};

const FAIXA_COLORS: Record<string, string> = {
  "6-9": "bg-blue-100 text-blue-800",
  "10-13": "bg-amber-100 text-amber-800",
  "14+": "bg-green-100 text-green-800",
};

export function JiuJitsuProfessoresTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);

  const { data: professores = [], isLoading } = useQuery({
    queryKey: ["jiujitsu_professores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jiujitsu_professores")
        .select("*")
        .eq("ativo", true)
        .order("faixa_etaria")
        .order("funcao")
        .order("nome");
      if (error) throw error;

      // Buscar nomes de membros vinculados
      const memberIds = (data || []).filter((p) => p.member_id).map((p) => p.member_id);
      let memberMap: Record<string, string> = {};
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from("members_safe")
          .select("id, full_name")
          .in("id", memberIds);
        if (members) {
          memberMap = Object.fromEntries(members.map((m: any) => [m.id, m.full_name]));
        }
      }

      // Buscar turmas vinculadas
      const turmaIds = (data || []).filter((p) => p.turma_id).map((p) => p.turma_id);
      let turmaMap: Record<string, string> = {};
      if (turmaIds.length > 0) {
        const { data: turmas } = await supabase
          .from("jiujitsu_turmas")
          .select("id, nome")
          .in("id", turmaIds);
        if (turmas) {
          turmaMap = Object.fromEntries(turmas.map((t: any) => [t.id, t.nome]));
        }
      }

      return (data || []).map((p: any) => ({
        ...p,
        membro_nome: memberMap[p.member_id] || null,
        turma_nome: turmaMap[p.turma_id] || null,
      }));
    },
  });

  const handleDelete = async () => {
    if (!deletingItem) return;
    const { error } = await supabase
      .from("jiujitsu_professores")
      .update({ ativo: false })
      .eq("id", deletingItem.id);
    if (!error) {
      toast({ title: "Removido com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_professores"] });
    } else {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
    setDeletingItem(null);
  };

  const filtered = professores.filter(
    (p: any) =>
      includesNormalized(p.nome, searchTerm) ||
      includesNormalized(p.turma_nome || "", searchTerm)
  );

  // Agrupar por faixa etária
  const grouped = ["6-9", "10-13", "14+"].map((faixa) => ({
    faixa,
    label: FAIXA_LABELS[faixa],
    items: filtered.filter((p: any) => p.faixa_etaria === faixa),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <SearchInput
          placeholder="Buscar professor ou auxiliar..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1 max-w-md"
        />
        <div className="flex gap-2">
          <ExportButton
            data={filtered}
            columns={[
              { header: "Nome", accessor: "nome" },
              { header: "Função", accessor: (r: any) => r.funcao === "professor" ? "Professor" : "Auxiliar" },
              { header: "Faixa Etária", accessor: (r: any) => FAIXA_LABELS[r.faixa_etaria] || r.faixa_etaria },
              { header: "Turma", accessor: (r: any) => r.turma_nome || "-" },
              { header: "Observações", accessor: "observacoes" },
            ]}
            filename="jiujitsu-professores"
            title="Professores e Auxiliares"
            sheetName="Professores"
          />
          <Button onClick={() => { setEditingItem(null); setFormOpen(true); }} className="bg-secondary hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-secondary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm ? "Nenhum resultado encontrado" : "Nenhum professor ou auxiliar cadastrado"}
          </CardContent>
        </Card>
      ) : (
        grouped
          .filter((g) => g.items.length > 0)
          .map((group) => (
            <div key={group.faixa} className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-secondary" />
                {group.label}
                <Badge variant="secondary">{group.items.length}</Badge>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((prof: any) => (
                  <Card key={prof.id} className="hover:border-secondary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-secondary shrink-0" />
                            <h4 className="font-semibold text-foreground truncate">{prof.nome}</h4>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant={prof.funcao === "professor" ? "default" : "outline"}>
                              {prof.funcao === "professor" ? "Professor" : "Auxiliar"}
                            </Badge>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FAIXA_COLORS[prof.faixa_etaria] || ""}`}>
                              {FAIXA_LABELS[prof.faixa_etaria]}
                            </span>
                          </div>
                          {prof.turma_nome && (
                            <p className="text-sm text-muted-foreground mt-1.5">
                              Turma: {prof.turma_nome}
                            </p>
                          )}
                          {prof.observacoes && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{prof.observacoes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingItem(prof); setFormOpen(true); }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingItem(prof)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
      )}

      <ProfessorFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingItem(null);
        }}
        professor={editingItem}
      />

      <AlertDialog open={!!deletingItem} onOpenChange={(o) => !o && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover {deletingItem?.nome}? O registro será desativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
