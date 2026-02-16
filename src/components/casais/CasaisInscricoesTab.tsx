import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardList, Eye } from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";
import { useToast } from "@/hooks/use-toast";
import { InscricaoCompletaFormDialog } from "./InscricaoCompletaFormDialog";
import { ExportButton } from "@/components/ui/export-button";
import { formatDateBR } from "@/lib/masks";

export function CasaisInscricoesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: turmas } = useQuery({
    queryKey: ["casais_turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_turmas")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: inscricoes, isLoading } = useQuery({
    queryKey: ["casais_inscricoes_completas", turmaFilter],
    queryFn: async () => {
      let query = supabase
        .from("casais_inscritos")
        .select(`
          *,
          turma:casais_turmas(id, nome),
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, whatsapp, email),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, whatsapp, email),
          casa_refugio:casas_refugio!casais_inscritos_casa_refugio_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (turmaFilter !== "all") {
        query = query.eq("turma_id", turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja remover esta inscrição?")) return;
    const { error } = await supabase.from("casais_inscritos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover inscrição", variant: "destructive" });
    } else {
      toast({ title: "Inscrição removida" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscricoes_completas"] });
    }
  };

  const filteredInscricoes = inscricoes?.filter((c) => {
    const nomeM = c.membro_masculino?.full_name || c.nome_masculino || "";
    const nomeF = c.membro_feminino?.full_name || c.nome_feminino || "";
    return includesNormalized(nomeM, searchTerm) || includesNormalized(nomeF, searchTerm);
  });

  const turmasAtivas = turmas?.filter((t) => !!t?.id && !!t?.ativo) || [];

  const modalidadeLabel = (m: string | null) => {
    const map: Record<string, string> = {
      uniao_estavel: "União Estável",
      morando_juntos: "Morando Juntos",
      civil_religioso: "Civil e Religioso",
      so_civil: "Só Civil",
    };
    return m ? map[m] || m : "-";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Inscrições Completas
          </CardTitle>
          <Button onClick={() => { setEditingId(null); setIsFormOpen(true); }} disabled={turmasAtivas.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Inscrição
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <SearchInput placeholder="Buscar por nome..." value={searchTerm} onChange={setSearchTerm} className="flex-1" />
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas?.filter((t) => !!t?.id).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButton
            data={filteredInscricoes || []}
            columns={[
              { header: "Esposo", accessor: (r) => r.membro_masculino?.full_name || r.nome_masculino || "-" },
              { header: "Esposa", accessor: (r) => r.membro_feminino?.full_name || r.nome_feminino || "-" },
              { header: "Turma", accessor: (r) => r.turma?.nome || "-" },
              { header: "Modalidade", accessor: (r) => modalidadeLabel(r.modalidade_casamento) },
              { header: "Congrega", accessor: (r) => r.congrega_gileade ? "Sim" : "Não" },
            ]}
            filename="inscricoes-casais"
            title="Inscrições Casais"
            sheetName="Inscrições"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredInscricoes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma inscrição encontrada</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Esposo</TableHead>
                  <TableHead>Esposa</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead className="hidden md:table-cell">Modalidade</TableHead>
                  <TableHead className="hidden lg:table-cell">Congrega</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInscricoes?.map((insc) => (
                  <TableRow key={insc.id}>
                    <TableCell>
                      <p className="font-medium">{insc.membro_masculino?.full_name || insc.nome_masculino || "-"}</p>
                      <p className="text-xs text-muted-foreground">{insc.whatsapp_masculino || insc.membro_masculino?.whatsapp || ""}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{insc.membro_feminino?.full_name || insc.nome_feminino || "-"}</p>
                      <p className="text-xs text-muted-foreground">{insc.whatsapp_feminino || insc.membro_feminino?.whatsapp || ""}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{insc.turma?.nome || "-"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{modalidadeLabel(insc.modalidade_casamento)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={insc.congrega_gileade ? "default" : "secondary"}>
                        {insc.congrega_gileade ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingId(insc.id); setIsFormOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(insc.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />Remover
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

      <InscricaoCompletaFormDialog
        open={isFormOpen}
        onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingId(null); }}
        editingId={editingId}
        turmas={turmasAtivas}
      />
    </Card>
  );
}
