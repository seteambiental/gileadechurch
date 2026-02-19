import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Award, Users, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { CasalFormDialog } from "./CasalFormDialog";
import { LiderFormDialog } from "./LiderFormDialog";
import { CertificadoDialog } from "./CertificadoDialog";

interface TurmaDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma: any;
}

export function TurmaDetalhesDialog({ open, onOpenChange, turma }: TurmaDetalhesDialogProps) {
  const [isCasalFormOpen, setIsCasalFormOpen] = useState(false);
  const [isLiderFormOpen, setIsLiderFormOpen] = useState(false);
  const [isCertificadoOpen, setIsCertificadoOpen] = useState(false);
  const [selectedCasal, setSelectedCasal] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: casais } = useQuery({
    queryKey: ["casais_inscritos", turma?.id],
    queryFn: async () => {
      if (!turma?.id) return [];
      const { data, error } = await supabase
        .from("casais_inscritos")
        .select(`
          *,
          membro_masculino:members!casais_inscritos_membro_masculino_id_fkey(full_name, whatsapp),
          membro_feminino:members!casais_inscritos_membro_feminino_id_fkey(full_name, whatsapp)
        `)
        .eq("turma_id", turma.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!turma?.id,
  });

  const { data: lideres } = useQuery({
    queryKey: ["casais_lideres", turma?.id],
    queryFn: async () => {
      if (!turma?.id) return [];
      const { data, error } = await supabase
        .from("casais_lideres")
        .select(`
          *,
          membro_masculino:members!casais_lideres_membro_masculino_id_fkey(full_name),
          membro_feminino:members!casais_lideres_membro_feminino_id_fkey(full_name)
        `)
        .eq("turma_id", turma.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!turma?.id,
  });

  const handleDeleteCasal = async (id: string) => {
    if (!confirm("Deseja remover este casal da turma?")) return;
    const { error } = await supabase.from("casais_inscritos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover casal", variant: "destructive" });
    } else {
      toast({ title: "Casal removido" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
    }
  };

  const handleDeleteLider = async (id: string) => {
    if (!confirm("Deseja remover este líder?")) return;
    const { error } = await supabase.from("casais_lideres").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover líder", variant: "destructive" });
    } else {
      toast({ title: "Líder removido" });
      queryClient.invalidateQueries({ queryKey: ["casais_lideres"] });
    }
  };

  const handleEmitirCertificado = (casal: any) => {
    setSelectedCasal(casal);
    setIsCertificadoOpen(true);
  };

  if (!turma) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {turma.nome}
              <Badge variant={turma.ativo ? "default" : "secondary"}>
                {turma.ativo ? "Ativa" : "Encerrada"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {turma.data_inicio && (
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">{format(parseLocalDate(turma.data_inicio), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            )}
            {turma.data_fim && (
              <div>
                <p className="text-xs text-muted-foreground">Término</p>
                <p className="font-medium">{format(parseLocalDate(turma.data_fim), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
            )}
            {turma.horario && (
              <div>
                <p className="text-xs text-muted-foreground">Horário</p>
                <p className="font-medium">{turma.horario}</p>
              </div>
            )}
            {turma.local && (
              <div>
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="font-medium">{turma.local}</p>
              </div>
            )}
          </div>

          <Tabs defaultValue="casais">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="casais" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Casais ({casais?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="lideres" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Líderes ({lideres?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="casais" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setIsCasalFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Casal
                </Button>
              </div>

              {casais?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum casal inscrito</p>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Esposo</TableHead>
                        <TableHead>Esposa</TableHead>
                        <TableHead className="hidden md:table-cell">Casamento</TableHead>
                        <TableHead>Certificado</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {casais?.map((casal) => (
                        <TableRow key={casal.id}>
                          <TableCell>
                            {casal.membro_masculino?.full_name || casal.nome_masculino || "-"}
                          </TableCell>
                          <TableCell>
                            {casal.membro_feminino?.full_name || casal.nome_feminino || "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {casal.data_casamento ? 
                              format(parseLocalDate(casal.data_casamento), "dd/MM/yyyy", { locale: ptBR }) : 
                              casal.tempo_casamento || "-"
                            }
                          </TableCell>
                          <TableCell>
                            {casal.certificado_emitido ? (
                              <Badge variant="outline" className="text-green-600">Emitido</Badge>
                            ) : (
                              <Badge variant="secondary">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEmitirCertificado(casal)}
                                title="Emitir Certificado"
                              >
                                <Award className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCasal(casal.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lideres" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setIsLiderFormOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Líder
                </Button>
              </div>

              {lideres?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum líder cadastrado</p>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Esposo</TableHead>
                        <TableHead>Esposa</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lideres?.map((lider) => (
                        <TableRow key={lider.id}>
                          <TableCell>{lider.membro_masculino?.full_name || "-"}</TableCell>
                          <TableCell>{lider.membro_feminino?.full_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{lider.funcao || "Líder"}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLider(lider.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CasalFormDialog
        open={isCasalFormOpen}
        onOpenChange={setIsCasalFormOpen}
        turmaId={turma?.id}
      />

      <LiderFormDialog
        open={isLiderFormOpen}
        onOpenChange={setIsLiderFormOpen}
        turmaId={turma?.id}
      />

      <CertificadoDialog
        open={isCertificadoOpen}
        onOpenChange={setIsCertificadoOpen}
        casal={selectedCasal}
        turma={turma}
      />
    </>
  );
}
