import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users, DollarSign, Briefcase, Calendar } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { MembroFamiliaFormDialog } from "./MembroFamiliaFormDialog";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";

interface FamiliaDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familia: any;
}

export function FamiliaDetalhesDialog({ open, onOpenChange, familia }: FamiliaDetalhesDialogProps) {
  const [membroDialogOpen, setMembroDialogOpen] = useState(false);
  const [selectedMembro, setSelectedMembro] = useState<any>(null);
  const [deleteMembroId, setDeleteMembroId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: membros, isLoading } = useQuery({
    queryKey: ["familia_membros", familia?.id],
    queryFn: async () => {
      if (!familia?.id) return [];
      const { data, error } = await supabase
        .from("acao_social_familia_membros")
        .select("*")
        .eq("familia_id", familia.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!familia?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("acao_social_familia_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familia_membros", familia?.id] });
      queryClient.invalidateQueries({ queryKey: ["acao_social_familia_membros_count"] });
      updateRendaTotal();
      toast.success("Membro removido");
    },
    onError: () => {
      toast.error("Erro ao remover membro");
    },
  });

  const updateRendaTotal = async () => {
    if (!familia?.id) return;
    const { data } = await supabase
      .from("acao_social_familia_membros")
      .select("salario")
      .eq("familia_id", familia.id);
    
    const rendaTotal = data?.reduce((acc, m) => acc + (m.salario || 0), 0) || 0;
    
    await supabase
      .from("acao_social_familias")
      .update({ renda_total: rendaTotal })
      .eq("id", familia.id);
    
    queryClient.invalidateQueries({ queryKey: ["acao_social_familias"] });
  };

  const calcularIdade = (dataNascimento: string | null) => {
    if (!dataNascimento) return null;
    return differenceInYears(new Date(), parseLocalDate(dataNascimento));
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const handleEditMembro = (membro: any) => {
    setSelectedMembro(membro);
    setMembroDialogOpen(true);
  };

  const handleNewMembro = () => {
    setSelectedMembro(null);
    setMembroDialogOpen(true);
  };

  // Calculate summary
  const rendaTotal = membros?.reduce((acc, m) => acc + (m.salario || 0), 0) || 0;
  const membrosTrabalhando = membros?.filter((m) => m.trabalha).length || 0;

  if (!familia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {familia.nome_familia}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Membros</p>
                    <p className="text-xl font-bold">{membros?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Renda Total</p>
                    <p className="text-xl font-bold">{formatCurrency(rendaTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trabalhando</p>
                    <p className="text-xl font-bold">{membrosTrabalhando}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Family Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações da Família</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Endereço:</span>{" "}
                  {familia.endereco ? `${familia.endereco}, ${familia.numero || "S/N"}` : "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Bairro:</span> {familia.bairro || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Cidade:</span> {familia.cidade || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">WhatsApp:</span> {familia.whatsapp || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Casa Refúgio:</span>{" "}
                  {familia.casa_refugio?.name || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Líder Responsável:</span>{" "}
                  {familia.lider?.full_name || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo de Ajuda:</span>{" "}
                  {familia.tipo_ajuda || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Frequência:</span>{" "}
                  {familia.frequencia_ajuda || "-"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Family Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Membros da Família</CardTitle>
              <Button size="sm" onClick={handleNewMembro}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Membro
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-center py-4">Carregando...</p>
              ) : membros?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum membro cadastrado. Clique em "Adicionar Membro" para começar.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Gênero</TableHead>
                        <TableHead>Parentesco</TableHead>
                        <TableHead>Idade</TableHead>
                        <TableHead className="hidden md:table-cell">Profissão</TableHead>
                        <TableHead className="hidden md:table-cell">Salário</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membros?.map((membro) => (
                        <TableRow
                          key={membro.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleEditMembro(membro)}
                        >
                          <TableCell className="font-medium">{membro.nome}</TableCell>
                          <TableCell>
                            {membro.genero ? (
                              <Badge variant={membro.genero === "Masculino" ? "outline" : "secondary"}>
                                {membro.genero === "Masculino" ? "M" : "F"}
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{membro.parentesco || "-"}</TableCell>
                          <TableCell>
                            {membro.data_nascimento ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {calcularIdade(membro.data_nascimento)} anos
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {membro.trabalha ? (
                              <Badge variant="outline">{membro.profissao || "Não informado"}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Não trabalha</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatCurrency(membro.salario)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteMembroId(membro.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <MembroFamiliaFormDialog
          open={membroDialogOpen}
          onOpenChange={setMembroDialogOpen}
          familiaId={familia?.id}
          membro={selectedMembro}
          onSuccess={updateRendaTotal}
        />
        <ConfirmDialog
          open={!!deleteMembroId}
          onOpenChange={(open) => !open && setDeleteMembroId(null)}
          onConfirm={() => { if (deleteMembroId) { deleteMutation.mutate(deleteMembroId); setDeleteMembroId(null); } }}
        />
      </DialogContent>
    </Dialog>
  );
}
