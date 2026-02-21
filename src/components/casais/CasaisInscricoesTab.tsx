import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, MoreHorizontal, Pencil, Trash2, ClipboardList, CheckCircle } from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";
import { useToast } from "@/hooks/use-toast";
import { InscricaoCompletaFormDialog } from "./InscricaoCompletaFormDialog";
import { ExportButton } from "@/components/ui/export-button";

export function CasaisInscricoesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalTurmaId, setApprovalTurmaId] = useState("");
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
    queryKey: ["casais_inscricoes_pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casais_inscritos")
        .select(`
          *,
          turma:casais_turmas(id, nome),
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, whatsapp, email),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, whatsapp, email),
          casa_refugio:casas_refugio!casais_inscritos_casa_refugio_id_fkey(name)
        `)
        .or("status.eq.pendente,status.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("casais_inscritos").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao remover inscrição", variant: "destructive" });
    } else {
      toast({ title: "Inscrição removida" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscricoes_pendentes"] });
    }
    setDeleteId(null);
  };

  const handleApprove = async () => {
    if (!approvingId || !approvalTurmaId) {
      toast({ title: "Selecione a turma para aprovar", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("casais_inscritos")
      .update({ status: "aprovado", turma_id: approvalTurmaId })
      .eq("id", approvingId);
    if (error) {
      toast({ title: "Erro ao aprovar inscrição", variant: "destructive" });
    } else {
      toast({ title: "Inscrição aprovada! Casal movido para a aba Casais." });
      queryClient.invalidateQueries({ queryKey: ["casais_inscricoes_pendentes"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_all"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
      setApprovingId(null);
      setApprovalTurmaId("");
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
            Inscrições Pendentes
          </CardTitle>
          <Button onClick={() => { setEditingId(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Inscrição
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <SearchInput placeholder="Buscar por nome..." value={searchTerm} onChange={setSearchTerm} className="flex-1" />
          <ExportButton
            data={filteredInscricoes || []}
            columns={[
              { header: "Esposo", accessor: (r) => r.membro_masculino?.full_name || r.nome_masculino || "-" },
              { header: "Esposa", accessor: (r) => r.membro_feminino?.full_name || r.nome_feminino || "-" },
              { header: "Modalidade", accessor: (r) => modalidadeLabel(r.modalidade_casamento) },
              { header: "Congrega", accessor: (r) => r.congrega_gileade ? "Sim" : "Não" },
            ]}
            filename="inscricoes-pendentes-casais"
            title="Inscrições Pendentes"
            sheetName="Inscrições"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredInscricoes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma inscrição pendente</div>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome Completo do Esposo</TableHead>
                  <TableHead>Nome Completo da Esposa</TableHead>
                  <TableHead className="hidden md:table-cell">Modalidade</TableHead>
                  <TableHead className="hidden lg:table-cell">Congrega</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
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
                    <TableCell className="hidden md:table-cell">{modalidadeLabel(insc.modalidade_casamento)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant={insc.congrega_gileade ? "default" : "secondary"}>
                        {insc.congrega_gileade ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-amber-600 border-amber-600">Pendente</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => { setApprovingId(insc.id); setApprovalTurmaId(""); }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingId(insc.id); setIsFormOpen(true); }}>
                              <Pencil className="w-4 h-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteId(insc.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Remover
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

      <InscricaoCompletaFormDialog
        open={isFormOpen}
        onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingId(null); }}
        editingId={editingId}
        turmas={turmasAtivas}
      />

      {/* Dialog de Aprovação com seleção de turma */}
      <Dialog open={!!approvingId} onOpenChange={(open) => { if (!open) { setApprovingId(null); setApprovalTurmaId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar Inscrição</DialogTitle>
            <DialogDescription>Selecione a turma em que este casal irá participar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Turma *</Label>
              <Select value={approvalTurmaId} onValueChange={setApprovalTurmaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                <SelectContent>
                  {turmasAtivas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setApprovingId(null); setApprovalTurmaId(""); }}>Cancelar</Button>
              <Button onClick={handleApprove} disabled={!approvalTurmaId} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Aprovação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
