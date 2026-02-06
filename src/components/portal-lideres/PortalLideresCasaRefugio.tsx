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
  UserPlus,
  Eye,
  ChevronLeft,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format, parseISO, isWithinInterval, getDay, addWeeks, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EncontroFormDialog } from "@/components/casas-refugio/EncontroFormDialog";
import { VincularMembroDialog } from "@/components/casas-refugio/VincularMembroDialog";
import { MembrosVinculadosList } from "@/components/casas-refugio/MembrosVinculadosList";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { toast } from "sonner";

interface PortalLideresCasaRefugioProps {
  portalAccess: PortalAccess | null;
  memberCasasRefugio: { id: string; name: string; isLider: boolean }[];
  canEdit: boolean;
}

export const PortalLideresCasaRefugio = ({
  portalAccess,
  memberCasasRefugio,
  canEdit,
}: PortalLideresCasaRefugioProps) => {
  const queryClient = useQueryClient();
  const [selectedCasa, setSelectedCasa] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showEncontroDialog, setShowEncontroDialog] = useState(false);
  const [editingEncontro, setEditingEncontro] = useState<any>(null);
  const [deletingEncontroId, setDeletingEncontroId] = useState<string | null>(null);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [encontrosPage, setEncontrosPage] = useState(1);
  const ENCONTROS_PER_PAGE = 5;

  // Determinar escopo de acesso
  const sindicoCondominios = portalAccess?.sindicoCondominios || [];
  const supervisorCondominios = portalAccess?.supervisorCondominios || [];
  const casasRefugioIds = portalAccess?.casasRefugioIds || [];
  // Importante: se houver escopo explícito (ex.: síndico), ele tem prioridade mesmo que o role seja pastor.
  const isFullAccess =
    (portalAccess?.role === "pastor_geral" || portalAccess?.role === "pastor_auxiliar") &&
    sindicoCondominios.length === 0 &&
    supervisorCondominios.length === 0 &&
    casasRefugioIds.length === 0;
  const isSindico = sindicoCondominios.length > 0;
  const isSupervisorCondominio = supervisorCondominios.length > 0;

  // Verificar se é líder da casa selecionada
  const isLiderDaCasa = (casaId: string) => {
    return memberCasasRefugio.some((c) => c.id === casaId && c.isLider);
  };

  // Verificar se pode editar a casa específica
  const canEditCasa = (casaId: string) => {
    if (!canEdit) return false;
    if (portalAccess?.role === "pastor_geral" || portalAccess?.role === "pastor_auxiliar") return true;
    if (portalAccess?.role === "sindico_condominio") return true;
    if (portalAccess?.role === "supervisor_condominio") return true;
    return isLiderDaCasa(casaId);
  };

  const { data: casas = [], isLoading: loadingCasas } = useQuery({
    queryKey: ["portal-lideres-casas-refugio", sindicoCondominios, supervisorCondominios, casasRefugioIds, isFullAccess],
    queryFn: async () => {
      let query = supabase
        .from("casas_refugio")
        .select(`
          *,
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name),
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name),
          supervisor_esposa:members!casas_refugio_supervisor_esposa_id_fkey(full_name)
        `)
        .order("name");

      // Síndico vê casas do seu condomínio (por nome)
      if (isSindico) {
        query = query.in("condominio", sindicoCondominios);
      } 
      // Supervisor de condomínio vê casas do seu condomínio
      else if (isSupervisorCondominio) {
        query = query.in("condominio", supervisorCondominios);
      }
      // Líder/Supervisor de casa refúgio vê casas específicas por ID
      else if (!isFullAccess && casasRefugioIds.length > 0) {
        query = query.in("id", casasRefugioIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Buscar encontros da casa selecionada
  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["portal-lideres-encontros-casa", selectedCasa],
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

  const casaSelecionada = casas.find((c) => c.id === selectedCasa);
  const canEditSelected = selectedCasa ? canEditCasa(selectedCasa) : false;

  // Filtrar encontros por data
  const filteredEncontros = useMemo(() => {
    if (!startDate && !endDate) return encontros;
    
    return encontros.filter((encontro) => {
      const encontroDate = parseISO(encontro.data_encontro);
      
      if (startDate && endDate) {
        return isWithinInterval(encontroDate, {
          start: parseISO(startDate),
          end: parseISO(endDate),
        });
      }
      
      if (startDate) return encontroDate >= parseISO(startDate);
      if (endDate) return encontroDate <= parseISO(endDate);
      
      return true;
    });
  }, [encontros, startDate, endDate]);

  // Gerar encontros esperados (linhas em branco) com base na config da casa
  const mergedEncontros = useMemo(() => {
    if (!casaSelecionada) return filteredEncontros.map((e: any) => ({ ...e, is_blank: false }));

    const diasStr = casaSelecionada.dias;
    const frequencia = casaSelecionada.frequencia;
    if (!diasStr) return filteredEncontros.map((e: any) => ({ ...e, is_blank: false }));

    const dayMap: Record<string, number> = {
      "domingo": 0, "segunda": 1, "terca": 2, "terça": 2,
      "quarta": 3, "quinta": 4, "sexta": 5, "sabado": 6, "sábado": 6,
    };

    const normalizedDay = diasStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("-feira", "").trim();
    const targetDayNum = dayMap[normalizedDay];
    if (targetDayNum === undefined) return filteredEncontros.map((e: any) => ({ ...e, is_blank: false }));

    const isQuinzenal = frequencia?.toLowerCase().includes("quinzenal");
    const today = startOfDay(new Date());
    const startRef = new Date(2026, 1, 1); // Feb 1, 2026

    let current = new Date(startRef);
    while (getDay(current) !== targetDayNum) {
      current.setDate(current.getDate() + 1);
    }

    const expectedDates: string[] = [];
    while (!isAfter(current, today)) {
      const dateStr = format(current, "yyyy-MM-dd");
      // Apply date filter
      if (startDate && isBefore(parseISO(dateStr), parseISO(startDate))) {
        current = addWeeks(current, isQuinzenal ? 2 : 1);
        continue;
      }
      if (endDate && isAfter(parseISO(dateStr), parseISO(endDate))) {
        break;
      }
      expectedDates.push(dateStr);
      current = addWeeks(current, isQuinzenal ? 2 : 1);
    }

    const encontrosByDate = new Map(
      filteredEncontros.map((e: any) => [e.data_encontro, e])
    );

    const merged = expectedDates.map((dateStr) => {
      const actual = encontrosByDate.get(dateStr);
      if (actual) return { ...actual, is_blank: false };
      return {
        id: `blank-${dateStr}`,
        data_encontro: dateStr,
        casa_refugio_id: casaSelecionada.id,
        qtd_lideres: 0,
        qtd_membros: 0,
        qtd_criancas: 0,
        qtd_visitantes: 0,
        kilos_arrecadados: 0,
        ofertas: 0,
        ofertas_dinheiro: 0,
        ofertas_pix: 0,
        observacoes: null,
        photo_url: null,
        is_blank: true,
      };
    });

    // Add any actual encounters not in expected dates
    filteredEncontros.forEach((e: any) => {
      if (!expectedDates.includes(e.data_encontro)) {
        merged.push({ ...e, is_blank: false });
      }
    });

    merged.sort((a: any, b: any) => b.data_encontro.localeCompare(a.data_encontro));
    return merged;
  }, [filteredEncontros, casaSelecionada, startDate, endDate]);

  // Calcular estatísticas (somente encontros reais)
  const realEncontros = mergedEncontros.filter((e: any) => !e.is_blank);
  const totalEncontros = realEncontros.length;
  const totalLideres = realEncontros.reduce((acc: number, e: any) => acc + (e.qtd_lideres || 0), 0);
  const totalMembros = realEncontros.reduce((acc: number, e: any) => acc + (e.qtd_membros || 0), 0);
  const totalCriancas = realEncontros.reduce((acc: number, e: any) => acc + (e.qtd_criancas || 0), 0);
  const totalVisitantes = realEncontros.reduce((acc: number, e: any) => acc + (e.qtd_visitantes || 0), 0);
  const totalPessoas = totalLideres + totalMembros + totalCriancas + totalVisitantes;
  const totalKilos = realEncontros.reduce((acc: number, e: any) => acc + Number(e.kilos_arrecadados || 0), 0);
  const totalOfertas = realEncontros.reduce((acc: number, e: any) => acc + Number(e.ofertas || 0), 0);
  const mediaPessoas = totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0;

  // Pagination
  const totalEncontrosPages = Math.ceil(mergedEncontros.length / ENCONTROS_PER_PAGE);
  const paginatedEncontros = mergedEncontros.slice(
    (encontrosPage - 1) * ENCONTROS_PER_PAGE,
    encontrosPage * ENCONTROS_PER_PAGE
  );


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
      queryClient.invalidateQueries({ queryKey: ["portal-lideres-encontros-casa", selectedCasa] });
      toast.success("Encontro excluído com sucesso!");
      setDeletingEncontroId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir encontro");
    },
  });

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  // Gerar nome dos líderes
  const getLideresNome = (casa: any) => {
    const nomes: string[] = [];
    if (casa.lider?.full_name) nomes.push(casa.lider.full_name.split(" ")[0]);
    if (casa.lider_esposa?.full_name) nomes.push(casa.lider_esposa.full_name.split(" ")[0]);
    if (nomes.length > 0) return nomes.join(" e ");
    return casa.lideres || "—";
  };

  // Gerar nome dos supervisores
  const getSupervisoresNome = (casa: any) => {
    const nomes: string[] = [];
    if (casa.supervisor?.full_name) nomes.push(casa.supervisor.full_name.split(" ")[0]);
    if (casa.supervisor_esposa?.full_name) nomes.push(casa.supervisor_esposa.full_name.split(" ")[0]);
    if (nomes.length > 0) return nomes.join(" e ");
    return casa.supervisores || "—";
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading font-bold text-xl">Casas Refúgio</h2>
          <p className="text-sm text-muted-foreground">
            {casas.length} casa(s) sob sua responsabilidade
          </p>
        </div>
        {!canEdit && (
          <Badge variant="outline" className="gap-1">
            <Eye className="w-3 h-3" />
            Visualização
          </Badge>
        )}
      </div>

      {!selectedCasa ? (
        // Lista de Casas
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {casas.map((casa) => {
            const canEditThis = canEditCasa(casa.id);
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
                  <div className="mt-3 flex items-center gap-2">
                    {isLiderDaCasa(casa.id) && <Badge variant="secondary">Líder</Badge>}
                    {canEditThis && <Badge variant="outline">Editar</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {getLideresNome(casa)}
                  </p>
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
            
            {canEditSelected && (
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
                        {getLideresNome(casaSelecionada)}
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
                      {getSupervisoresNome(casaSelecionada)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Condomínio:</span>{" "}
                      {casaSelecionada.condominio || "—"}
                    </div>
                  </div>
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

              {/* Histórico de Encontros */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Histórico de Encontros ({mergedEncontros.length})
                </h3>
                {loadingEncontros ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                  </div>
                ) : mergedEncontros.length === 0 ? (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum encontro registrado
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {paginatedEncontros.map((encontro: any) => {
                      const total =
                        (encontro.qtd_lideres || 0) +
                        (encontro.qtd_membros || 0) +
                        (encontro.qtd_criancas || 0) +
                        (encontro.qtd_visitantes || 0);
                      return (
                        <Card
                          key={encontro.id}
                          className={encontro.is_blank ? "border-destructive/30 bg-destructive/5" : ""}
                        >
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-medium ${encontro.is_blank ? "text-destructive font-bold" : ""}`}>
                                  {format(parseISO(encontro.data_encontro), "dd/MM/yyyy")}
                                  {encontro.is_blank && (
                                    <span className="ml-2 text-xs">(pendente)</span>
                                  )}
                                </p>
                                {!encontro.is_blank && (
                                  <p className="text-sm text-muted-foreground">
                                    {total} pessoas • {encontro.kilos_arrecadados || 0} kg • R$ {Number(encontro.ofertas || 0).toFixed(2)}
                                  </p>
                                )}
                                {encontro.is_blank && (
                                  <p className="text-xs text-destructive/70">
                                    Encontro não relatado
                                  </p>
                                )}
                              </div>
                              {canEditSelected && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (encontro.is_blank) {
                                        setEditingEncontro({
                                          ...encontro,
                                          id: undefined,
                                          is_blank: true,
                                        });
                                      } else {
                                        setEditingEncontro(encontro);
                                      }
                                      setShowEncontroDialog(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  {!encontro.is_blank && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      onClick={() => setDeletingEncontroId(encontro.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Paginação */}
                    {totalEncontrosPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEncontrosPage((p) => Math.max(1, p - 1))}
                          disabled={encontrosPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {encontrosPage} de {totalEncontrosPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEncontrosPage((p) => Math.min(totalEncontrosPages, p + 1))}
                          disabled={encontrosPage === totalEncontrosPages}
                        >
                          Próximo
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                <div className="bg-secondary/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-secondary">{totalLideres}</p>
                  <p className="text-xs text-muted-foreground">Líderes</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{totalMembros}</p>
                  <p className="text-xs text-muted-foreground">Membros</p>
                </div>
                <div className="bg-accent/30 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-accent-foreground">{totalCriancas}</p>
                  <p className="text-xs text-muted-foreground">Crianças</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{totalVisitantes}</p>
                  <p className="text-xs text-muted-foreground">Visitantes</p>
                </div>
              </div>

              {/* Membros Vinculados */}
              <MembrosVinculadosList
                casaRefugioId={selectedCasa}
                onVincularClick={canEditSelected ? () => setShowVincularDialog(true) : undefined}
              />

              {/* Gráficos */}
              <EncontrosCharts encontros={filteredEncontros} />
            </>
          )}

          {/* Dialog Encontro */}
          {selectedCasa && casaSelecionada && (
            <EncontroFormDialog
              open={showEncontroDialog}
              onOpenChange={(isOpen) => {
                setShowEncontroDialog(isOpen);
                if (!isOpen) {
                  setEditingEncontro(null);
                  queryClient.invalidateQueries({ queryKey: ["portal-lideres-encontros-casa", selectedCasa] });
                }
              }}
              casa={casaSelecionada}
              editingEncontro={editingEncontro}
            />
          )}

          {/* Dialog Vincular Membro */}
          {selectedCasa && casaSelecionada && (
            <VincularMembroDialog
              open={showVincularDialog}
              onOpenChange={setShowVincularDialog}
              casaRefugioId={selectedCasa}
              casaRefugioName={casaSelecionada.name}
            />
          )}

          {/* Dialog Confirmação Exclusão */}
          <AlertDialog open={!!deletingEncontroId} onOpenChange={() => setDeletingEncontroId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir encontro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O registro do encontro será
                  permanentemente removido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deletingEncontroId && deleteMutation.mutate(deletingEncontroId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};
