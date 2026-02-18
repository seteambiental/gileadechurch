import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
  Loader2,
  Package,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  FileDown,
  UserPlus,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format, isWithinInterval } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EncontroFormDialog } from "@/components/casas-refugio/EncontroFormDialog";
import { VincularMembroDialog } from "@/components/casas-refugio/VincularMembroDialog";
import { MembrosVinculadosList } from "@/components/casas-refugio/MembrosVinculadosList";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PortalCasaRefugioTabProps {
  portalAccess: PortalAccess | null;
  memberCasasRefugio: { id: string; name: string; isLider: boolean }[];
}

export const PortalCasaRefugioTab = ({
  portalAccess,
  memberCasasRefugio,
}: PortalCasaRefugioTabProps) => {
  const queryClient = useQueryClient();
  const [selectedCasa, setSelectedCasa] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showEncontroDialog, setShowEncontroDialog] = useState(false);
  const [editingEncontro, setEditingEncontro] = useState<any>(null);
  const [deletingEncontroId, setDeletingEncontroId] = useState<string | null>(null);
  const [showVincularDialog, setShowVincularDialog] = useState(false);

  // Determinar IDs das casas que o usuário pode ver
  const getCasaIds = () => {
    if (!portalAccess) return memberCasasRefugio.map((c) => c.id);

    // Pastor geral vê tudo
    if (portalAccess.role === "pastor_geral") return null; // null = todas

    // Líder vê suas casas
    if (portalAccess.casasRefugioIds) {
      return portalAccess.casasRefugioIds;
    }

    return memberCasasRefugio.map((c) => c.id);
  };

  const casaIds = getCasaIds();

  // Verificar se é líder da casa selecionada
  const isLiderDaCasa = (casaId: string) => {
    return memberCasasRefugio.some((c) => c.id === casaId && c.isLider);
  };

  const { data: casas = [], isLoading: loadingCasas } = useQuery({
    queryKey: ["portal-casas-refugio", casaIds],
    queryFn: async () => {
      let query = supabase
        .from("casas_refugio")
        .select("*")
        .order("name");

      if (casaIds && casaIds.length > 0) {
        query = query.in("id", casaIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Buscar encontros da casa selecionada
  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["portal-encontros-casa", selectedCasa],
    queryFn: async () => {
      if (!selectedCasa) return [];
      const { data, error } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .eq("casa_refugio_id", selectedCasa)
        .order("data_encontro", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCasa,
  });

  // Filtrar encontros por data
  const filteredEncontros = useMemo(() => {
    if (!startDate && !endDate) return encontros;
    
    return encontros.filter((encontro) => {
      const encontroDate = parseLocalDate(encontro.data_encontro);
      
      if (startDate && endDate) {
        return isWithinInterval(encontroDate, {
          start: parseLocalDate(startDate),
          end: parseLocalDate(endDate),
        });
      }
      
      if (startDate) return encontroDate >= parseLocalDate(startDate);
      if (endDate) return encontroDate <= parseLocalDate(endDate);
      
      return true;
    });
  }, [encontros, startDate, endDate]);

  // Calcular estatísticas
  const totalEncontros = filteredEncontros.length;
  const totalLideres = filteredEncontros.reduce((acc, e) => acc + (e.qtd_lideres || 0), 0);
  const totalMembros = filteredEncontros.reduce((acc, e) => acc + (e.qtd_membros || 0), 0);
  const totalCriancas = filteredEncontros.reduce((acc, e) => acc + (e.qtd_criancas || 0), 0);
  const totalVisitantes = filteredEncontros.reduce((acc, e) => acc + (e.qtd_visitantes || 0), 0);
  const totalPessoas = totalLideres + totalMembros + totalCriancas + totalVisitantes;
  const totalKilos = filteredEncontros.reduce((acc, e) => acc + Number(e.kilos_arrecadados || 0), 0);
  const totalOfertas = filteredEncontros.reduce((acc, e) => acc + Number(e.ofertas || 0), 0);
  const mediaPessoas = totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0;

  const casaSelecionada = casas.find((c) => c.id === selectedCasa);
  const isLider = selectedCasa ? isLiderDaCasa(selectedCasa) : false;

  // Mutation para excluir encontro
  const deleteMutation = useMutation({
    mutationFn: async (encontroId: string) => {
      const { error } = await supabase
        .from("encontros_casa_refugio")
        .delete()
        .eq("id", encontroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-encontros-casa", selectedCasa] });
      toast.success("Encontro excluído com sucesso!");
      setDeletingEncontroId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir encontro");
    },
  });

  // Exportar PDF do encontro
  const exportEncontroPDF = async (encontro: any) => {
    const doc = new jsPDF();
    const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
    const dataFormatada = format(parseLocalDate(encontro.data_encontro), "dd/MM/yyyy");
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DA CASA REFÚGIO", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(`${casaSelecionada?.name?.toUpperCase() || ""}`, 105, 30, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${dataFormatada}`, 105, 40, { align: "center" });
    
    autoTable(doc, {
      startY: 55,
      head: [["Descrição", "Valor"]],
      body: [
        ["Líderes", String(encontro.qtd_lideres || 0)],
        ["Membros", String(encontro.qtd_membros || 0)],
        ["Crianças", String(encontro.qtd_criancas || 0)],
        ["Visitantes", String(encontro.qtd_visitantes || 0)],
        ["Total de Pessoas", String(total)],
        ["Kilos Arrecadados", `${encontro.kilos_arrecadados || 0} kg`],
        ["Ofertas", `R$ ${Number(encontro.ofertas || 0).toFixed(2).replace(".", ",")}`],
      ],
      headStyles: { fillColor: [220, 53, 69] },
    });
    
    doc.save(`encontro-${format(parseLocalDate(encontro.data_encontro), "yyyy-MM-dd")}.pdf`);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  if (loadingCasas) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (casas.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Nenhuma Casa Refúgio vinculada</p>
          <p className="text-sm">
            Você ainda não está vinculado a nenhuma Casa Refúgio
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl">Casas Refúgio</h2>
        <p className="text-sm text-muted-foreground">
          {portalAccess?.role === "pastor_geral"
            ? "Todas as casas refúgio"
            : `${casas.length} casa(s) vinculada(s)`}
        </p>
      </div>

      {!selectedCasa ? (
        // Lista de Casas
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {casas.map((casa) => {
            const lider = isLiderDaCasa(casa.id);
            return (
              <Card
                key={casa.id}
                className="cursor-pointer hover:border-secondary transition-colors"
                onClick={() => setSelectedCasa(casa.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Home className="w-5 h-5 text-secondary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{casa.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {casa.condominio || "Sem condomínio"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  {lider && (
                    <Badge className="mt-3" variant="secondary">
                      Líder
                    </Badge>
                  )}
                  {casa.lideres && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {casa.lideres}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Detalhes da Casa Selecionada
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setSelectedCasa(null)}>
              ← Voltar
            </Button>
            
            {isLider && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowVincularDialog(true)}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Vincular Membro
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingEncontro(null);
                    setShowEncontroDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Encontro
                </Button>
              </div>
            )}
          </div>

          {casaSelecionada && (
            <>
              {/* Info Card */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Home className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground">
                        {casaSelecionada.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {casaSelecionada.lideres}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dias:</span>{" "}
                      {casaSelecionada.dias || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Frequência:</span>{" "}
                      {casaSelecionada.frequencia || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Supervisores:</span>{" "}
                      {casaSelecionada.supervisores || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Condomínio:</span>{" "}
                      {casaSelecionada.condominio || "—"}
                    </div>
                  </div>
                  {casaSelecionada.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {casaSelecionada.address}
                        {casaSelecionada.numero && `, ${casaSelecionada.numero}`} -{" "}
                        {casaSelecionada.neighborhood}, {casaSelecionada.city}/
                        {casaSelecionada.state}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Filtro de Data */}
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onApply={() => {}}
                onClear={clearFilters}
              />

              {/* Indicadores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Calendar className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{totalEncontros}</p>
                    <p className="text-xs text-muted-foreground">Encontros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{mediaPessoas}</p>
                    <p className="text-xs text-muted-foreground">Média/Encontro</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Package className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{totalKilos}</p>
                    <p className="text-xs text-muted-foreground">Kilos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <DollarSign className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">
                      R$ {totalOfertas.toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Ofertas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown por tipo */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-600">{totalLideres}</p>
                  <p className="text-xs text-muted-foreground">Líderes</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-600">{totalMembros}</p>
                  <p className="text-xs text-muted-foreground">Membros</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-amber-600">{totalCriancas}</p>
                  <p className="text-xs text-muted-foreground">Crianças</p>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-600">{totalVisitantes}</p>
                  <p className="text-xs text-muted-foreground">Visitantes</p>
                </div>
              </div>

              {/* Membros Vinculados */}
              {selectedCasa && (
                <MembrosVinculadosList
                  casaRefugioId={selectedCasa}
                  onVincularClick={isLider ? () => setShowVincularDialog(true) : undefined}
                />
              )}

              {/* Gráficos */}
              <EncontrosCharts encontros={filteredEncontros} />

              {/* Tabela de Encontros */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Histórico de Encontros ({filteredEncontros.length})
                </h3>
                {loadingEncontros ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                  </div>
                ) : filteredEncontros.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum encontro registrado
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-center">Líd.</TableHead>
                            <TableHead className="text-center">Memb.</TableHead>
                            <TableHead className="text-center">Vis.</TableHead>
                            <TableHead className="text-center">Cri.</TableHead>
                            <TableHead className="text-center">Total</TableHead>
                            <TableHead className="text-center">Kilos</TableHead>
                            <TableHead className="text-center">Ofertas</TableHead>
                            {isLider && <TableHead className="text-right">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEncontros.map((encontro) => {
                            const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
                            return (
                              <TableRow key={encontro.id}>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {format(parseLocalDate(encontro.data_encontro), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell className="text-center text-blue-600">{encontro.qtd_lideres || 0}</TableCell>
                                <TableCell className="text-center text-green-600">{encontro.qtd_membros || 0}</TableCell>
                                <TableCell className="text-center text-purple-600">{encontro.qtd_visitantes || 0}</TableCell>
                                <TableCell className="text-center text-amber-600">{encontro.qtd_criancas || 0}</TableCell>
                                <TableCell className="text-center font-medium">{total}</TableCell>
                                <TableCell className="text-center">{encontro.kilos_arrecadados || 0}</TableCell>
                                <TableCell className="text-center whitespace-nowrap">R$ {Number(encontro.ofertas || 0).toFixed(2).replace(".", ",")}</TableCell>
                                {isLider && (
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => exportEncontroPDF(encontro)}
                                      >
                                        <FileDown className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setEditingEncontro(encontro);
                                          setShowEncontroDialog(true);
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => setDeletingEncontroId(encontro.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Dialog para criar/editar encontro */}
      {casaSelecionada && (
        <EncontroFormDialog
          open={showEncontroDialog}
          onOpenChange={setShowEncontroDialog}
          casa={casaSelecionada}
          editingEncontro={editingEncontro}
        />
      )}

      {/* Dialog para vincular membro */}
      {casaSelecionada && (
        <VincularMembroDialog
          open={showVincularDialog}
          onOpenChange={setShowVincularDialog}
          casaRefugioId={casaSelecionada.id}
          casaRefugioName={casaSelecionada.name}
        />
      )}

      {/* Alert para confirmar exclusão */}
      <AlertDialog open={!!deletingEncontroId} onOpenChange={() => setDeletingEncontroId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir encontro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O encontro e todos os dados relacionados serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingEncontroId && deleteMutation.mutate(deletingEncontroId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
