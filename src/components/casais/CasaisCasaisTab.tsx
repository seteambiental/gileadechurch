import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, MoreHorizontal, Pencil, Trash2, Award, Heart, ArrowRightLeft } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { includesNormalized } from "@/lib/text-utils";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CasalFormDialog } from "./CasalFormDialog";
import { CertificadoDialog } from "./CertificadoDialog";
import { ExportButton } from "@/components/ui/export-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CasaisCasaisTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [isCertificadoOpen, setIsCertificadoOpen] = useState(false);
  const [selectedCasal, setSelectedCasal] = useState<any>(null);
  const [selectedTurma, setSelectedTurma] = useState<any>(null);
  const [editingCasal, setEditingCasal] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [changingTurmaCasal, setChangingTurmaCasal] = useState<any>(null);
  const [newTurmaId, setNewTurmaId] = useState("");
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

  const { data: casais, isLoading } = useQuery({
    queryKey: ["casais_inscritos_all", turmaFilter],
    queryFn: async () => {
      let query = supabase
        .from("casais_inscritos")
        .select(`
          *,
          turma:casais_turmas(id, nome),
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, whatsapp),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, whatsapp)
        `)
        .eq("status", "aprovado")
        .order("created_at", { ascending: false });

      if (turmaFilter !== "all") {
        query = query.eq("turma_id", turmaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("casais_inscritos").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao remover casal", variant: "destructive" });
    } else {
      toast({ title: "Casal removido" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_all"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
    }
    setDeleteId(null);
  };

  const handleAddCasal = (turmaId: string) => {
    setEditingCasal(null);
    setSelectedTurmaId(turmaId);
    setIsFormOpen(true);
  };

  const handleEditCasal = (casal: any) => {
    setEditingCasal(casal);
    setSelectedTurmaId(casal.turma_id);
    setIsFormOpen(true);
  };

  const handleEmitirCertificado = (casal: any) => {
    setSelectedCasal(casal);
    setSelectedTurma(casal.turma);
    setIsCertificadoOpen(true);
  };

  const filteredCasais = casais?.filter((c) => {
    const nomeM = c.membro_masculino?.full_name || c.nome_masculino || "";
    const nomeF = c.membro_feminino?.full_name || c.nome_feminino || "";
    return includesNormalized(nomeM, searchTerm) || includesNormalized(nomeF, searchTerm);
  });

  const turmasAtivas = turmas?.filter((t) => !!t?.id && !!t?.ativo) || [];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            Casais Inscritos
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={turmasAtivas.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Casal
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {turmasAtivas.length === 0 ? (
                <DropdownMenuItem disabled>Nenhuma turma ativa</DropdownMenuItem>
              ) : (
                turmasAtivas.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => handleAddCasal(t.id)}>
                    {t.nome}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <SearchInput
            placeholder="Buscar casais..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1"
          />
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas?.filter((t) => !!t?.id).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButton
            data={filteredCasais || []}
            columns={[
              { header: "Esposo", accessor: (r) => r.membro_masculino?.full_name || r.nome_masculino || "-" },
              { header: "Esposa", accessor: (r) => r.membro_feminino?.full_name || r.nome_feminino || "-" },
              { header: "Turma", accessor: (r) => r.turma?.nome || "-" },
              { header: "Data Casamento", accessor: (r) => r.data_casamento ? format(parseLocalDate(r.data_casamento), "dd/MM/yyyy") : r.tempo_casamento || "-" },
              { header: "Status", accessor: (r) => r.certificado_emitido ? "Concluído" : (r.status || "Ativo") },
            ]}
            filename="casais-inscritos"
            title="Casais Inscritos"
            sheetName="Casais"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredCasais?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {turmas?.length === 0 ? (
              <p>Cadastre uma turma primeiro para adicionar casais</p>
            ) : (
              <p>Nenhum casal inscrito</p>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Esposo</TableHead>
                  <TableHead>Esposa</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead className="hidden md:table-cell">Casamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCasais?.map((casal) => (
                  <TableRow key={casal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{casal.membro_masculino?.full_name || casal.nome_masculino || "-"}</p>
                        {(casal.membro_masculino?.whatsapp || casal.whatsapp_masculino) && (
                          <p className="text-xs text-muted-foreground">
                            {casal.membro_masculino?.whatsapp || casal.whatsapp_masculino}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{casal.membro_feminino?.full_name || casal.nome_feminino || "-"}</p>
                        {(casal.membro_feminino?.whatsapp || casal.whatsapp_feminino) && (
                          <p className="text-xs text-muted-foreground">
                            {casal.membro_feminino?.whatsapp || casal.whatsapp_feminino}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{casal.turma?.nome || "-"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {casal.data_casamento ? 
                        format(parseLocalDate(casal.data_casamento), "dd/MM/yyyy", { locale: ptBR }) : 
                        casal.tempo_casamento || "-"
                      }
                    </TableCell>
                    <TableCell>
                      {casal.certificado_emitido ? (
                        <Badge variant="default" className="bg-green-600">Concluído</Badge>
                      ) : (
                        <Badge variant="secondary">{casal.status || "Ativo"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCasal(casal)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmitirCertificado(casal)}>
                            <Award className="w-4 h-4 mr-2" />
                            Emitir Certificado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(casal.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
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

        {casais && casais.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{casais.length}</p>
                <p className="text-xs text-muted-foreground">Total de Casais</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{casais.filter(c => c.certificado_emitido).length}</p>
                <p className="text-xs text-muted-foreground">Certificados Emitidos</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{turmas?.filter(t => t.ativo).length || 0}</p>
                <p className="text-xs text-muted-foreground">Turmas Ativas</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{casais.filter(c => !c.certificado_emitido).length}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>

      {selectedTurmaId && (
        <CasalFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setSelectedTurmaId("");
              setEditingCasal(null);
            }
          }}
          turmaId={selectedTurmaId}
          casal={editingCasal}
        />
      )}

      <CertificadoDialog
        open={isCertificadoOpen}
        onOpenChange={setIsCertificadoOpen}
        casal={selectedCasal}
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
