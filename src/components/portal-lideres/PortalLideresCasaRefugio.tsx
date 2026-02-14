import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Image,
  ScanFace,
  FileDown,
  XCircle,
  ArrowRightLeft,
} from "lucide-react";
import { PortalAccess } from "@/hooks/useMemberPortal";
import { format, parseISO, isWithinInterval, getDay, addWeeks, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EncontroFormDialog } from "@/components/casas-refugio/EncontroFormDialog";
import { EncontroPreScreenDialog } from "@/components/casas-refugio/EncontroPreScreenDialog";
import { VincularMembroDialog } from "@/components/casas-refugio/VincularMembroDialog";
import { MembrosVinculadosList } from "@/components/casas-refugio/MembrosVinculadosList";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { AnalisePresencaDialog } from "@/components/casas-refugio/AnalisePresencaDialog";
import { toast } from "sonner";
import { CrExpressTab } from "@/components/casas-refugio/CrExpressTab";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [preScreenData, setPreScreenData] = useState<{ dataEncontro: string } | null>(null);
  const [encontrosPage, setEncontrosPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [analiseEncontro, setAnaliseEncontro] = useState<{
    id: string;
    photoUrl: string;
    dataEncontro: string;
  } | null>(null);
  const ENCONTROS_PER_PAGE = 5;

  const sindicoCondominios = portalAccess?.sindicoCondominios || [];
  const supervisorCondominios = portalAccess?.supervisorCondominios || [];
  const casasRefugioIds = portalAccess?.casasRefugioIds || [];
  const isFullAccess =
    (portalAccess?.role === "pastor_geral" || portalAccess?.role === "pastor_auxiliar") &&
    sindicoCondominios.length === 0 &&
    supervisorCondominios.length === 0 &&
    casasRefugioIds.length === 0;
  const isSindico = sindicoCondominios.length > 0;
  const isSupervisorCondominio = supervisorCondominios.length > 0;

  const isLiderDaCasa = (casaId: string) => {
    return memberCasasRefugio.some((c) => c.id === casaId && c.isLider);
  };

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

      if (isSindico) {
        query = query.in("condominio", sindicoCondominios);
      } else if (isSupervisorCondominio) {
        query = query.in("condominio", supervisorCondominios);
      } else if (!isFullAccess && casasRefugioIds.length > 0) {
        query = query.in("id", casasRefugioIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

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

  // Buscar membros vinculados para indicadores
  const { data: membrosVinculados = [] } = useQuery({
    queryKey: ["membros-vinculados-stats-portal", selectedCasa],
    queryFn: async () => {
      if (!selectedCasa) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date")
        .eq("casa_refugio_id", selectedCasa);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCasa,
  });

  const casaSelecionada = casas.find((c) => c.id === selectedCasa);
  const canEditSelected = selectedCasa ? canEditCasa(selectedCasa) : false;

  // Indicadores de membros vinculados (cadastro)
  const indicadoresVinculados = useMemo(() => {
    const hoje = new Date();
    const liderIds = [casaSelecionada?.lider_id, casaSelecionada?.lider_esposa_id].filter(Boolean);
    const qtdLideres = liderIds.length;
    let membrosAdultos = 0;
    let criancas = 0;
    membrosVinculados.forEach((m) => {
      if (liderIds.includes(m.id)) return;
      if (m.birth_date) {
        const nascimento = parseISO(m.birth_date);
        const idade = Math.floor((hoje.getTime() - nascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (idade < 12) criancas++;
        else membrosAdultos++;
      } else {
        membrosAdultos++;
      }
    });
    return { lideres: qtdLideres, membros: membrosAdultos, criancas, visitantes: 0, total: membrosVinculados.length };
  }, [membrosVinculados, casaSelecionada]);

  // Filtrar encontros por data
  const filteredEncontros = useMemo(() => {
    if (!startDate && !endDate) return encontros;
    return encontros.filter((encontro) => {
      const encontroDate = parseISO(encontro.data_encontro);
      if (startDate && endDate) {
        return isWithinInterval(encontroDate, { start: parseISO(startDate), end: parseISO(endDate) });
      }
      if (startDate) return encontroDate >= parseISO(startDate);
      if (endDate) return encontroDate <= parseISO(endDate);
      return true;
    });
  }, [encontros, startDate, endDate]);

  // Gerar encontros esperados (linhas em branco)
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
    const startRef = casaSelecionada.data_inicio_cr
      ? parseISO(casaSelecionada.data_inicio_cr)
      : new Date(2026, 1, 1);

    let current = new Date(startRef);
    while (getDay(current) !== targetDayNum) {
      current.setDate(current.getDate() + 1);
    }

    const expectedDates: string[] = [];
    while (!isAfter(current, today)) {
      const dateStr = format(current, "yyyy-MM-dd");
      if (startDate && isBefore(parseISO(dateStr), parseISO(startDate))) {
        current = addWeeks(current, isQuinzenal ? 2 : 1);
        continue;
      }
      if (endDate && isAfter(parseISO(dateStr), parseISO(endDate))) break;
      expectedDates.push(dateStr);
      current = addWeeks(current, isQuinzenal ? 2 : 1);
    }

    const encontrosByExpectedDate = new Map<string, any>();
    const matchedExpectedDates = new Set<string>();
    filteredEncontros.forEach((e: any) => {
      const key = e.data_esperada || e.data_encontro;
      encontrosByExpectedDate.set(key, e);
    });

    const merged = expectedDates.map((dateStr) => {
      const actual = encontrosByExpectedDate.get(dateStr);
      if (actual) {
        matchedExpectedDates.add(dateStr);
        return { ...actual, is_blank: false, display_date: actual.data_encontro };
      }
      return {
        id: `blank-${dateStr}`, data_encontro: dateStr, data_esperada: dateStr,
        casa_refugio_id: casaSelecionada.id, qtd_lideres: 0, qtd_membros: 0,
        qtd_criancas: 0, qtd_visitantes: 0, kilos_arrecadados: 0, ofertas: 0,
        ofertas_dinheiro: 0, ofertas_pix: 0, observacoes: null, photo_url: null,
        reuniao_realizada: true, justificativa: null, is_blank: true, display_date: dateStr,
      };
    });

    filteredEncontros.forEach((e: any) => {
      const key = e.data_esperada || e.data_encontro;
      if (!matchedExpectedDates.has(key) && !expectedDates.includes(key)) {
        merged.push({ ...e, is_blank: false, display_date: e.data_encontro });
      }
    });

    merged.sort((a: any, b: any) => b.data_encontro.localeCompare(a.data_encontro));
    return merged;
  }, [filteredEncontros, casaSelecionada, startDate, endDate]);

  // Estatísticas
  const realEncontros = mergedEncontros.filter((e: any) => !e.is_blank && e.reuniao_realizada !== false);
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

  // Quick cancel mutation
  const quickCancelMutation = useMutation({
    mutationFn: async ({ dataEncontro, justificativa }: { dataEncontro: string; justificativa: string }) => {
      const { error } = await supabase.from("encontros_casa_refugio").insert({
        casa_refugio_id: selectedCasa!,
        data_encontro: dataEncontro,
        data_esperada: dataEncontro,
        reuniao_realizada: false,
        justificativa,
        qtd_lideres: 0, qtd_membros: 0, qtd_criancas: 0, qtd_visitantes: 0,
        kilos_arrecadados: 0, ofertas: 0, ofertas_dinheiro: 0, ofertas_pix: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-lideres-encontros-casa", selectedCasa] });
      toast.success("Registro salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  // Export PDF
  const exportEncontroPDF = async (encontro: any) => {
    const doc = new jsPDF();
    const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
    const dataFormatada = format(parseISO(encontro.data_encontro), "dd/MM/yyyy");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DA CASA REFÚGIO", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text(`${casaSelecionada?.name?.toUpperCase() || ""}`, 105, 30, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${dataFormatada}`, 105, 40, { align: "center" });

    let startY = 55;
    if (encontro.photo_url) {
      try {
        const img = document.createElement("img") as HTMLImageElement;
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const maxWidth = 180; const maxHeight = 100;
            let width = img.width; let height = img.height;
            if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
            if (height > maxHeight) { width = (maxHeight / height) * width; height = maxHeight; }
            const x = (210 - width) / 2;
            doc.addImage(img, "JPEG", x, startY, width, height);
            startY += height + 10;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = encontro.photo_url;
        });
      } catch { /* continue without image */ }
    }

    autoTable(doc, {
      startY,
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
      styles: { fontSize: 11 },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

    if (encontro.observacoes) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(10);
      doc.text(`Observações: ${encontro.observacoes}`, 14, finalY + 10);
    }

    doc.save(`encontro-${format(parseISO(encontro.data_encontro), "yyyy-MM-dd")}.pdf`);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setEncontrosPage(1);
  };

  const getLideresNome = (casa: any) => {
    const nomes: string[] = [];
    if (casa.lider?.full_name) nomes.push(casa.lider.full_name.split(" ")[0]);
    if (casa.lider_esposa?.full_name) nomes.push(casa.lider_esposa.full_name.split(" ")[0]);
    if (nomes.length > 0) return nomes.join(" e ");
    return casa.lideres || "—";
  };

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
          <p className="text-sm">Você ainda não está vinculado a nenhuma Casa Refúgio</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="casas" className="space-y-4">
      <TabsList>
        <TabsTrigger value="casas">Casas Refúgio</TabsTrigger>
        <TabsTrigger value="cr-express">CR Express</TabsTrigger>
      </TabsList>

      <TabsContent value="cr-express">
        <CrExpressTab readOnly />
      </TabsContent>

      <TabsContent value="casas">
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
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setSelectedCasa(null)}>
                  ← Voltar
                </Button>
                {canEditSelected && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowVincularDialog(true)}>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Vincular Membro
                    </Button>
                    <Button size="sm" onClick={() => { setEditingEncontro(null); setShowEncontroDialog(true); }}>
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
                          <h2 className="font-bold text-foreground">{casaSelecionada.name}</h2>
                          <p className="text-sm text-muted-foreground">{getLideresNome(casaSelecionada)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Dias:</span> {casaSelecionada.dias || "—"}</div>
                        <div><span className="text-muted-foreground">Frequência:</span> {casaSelecionada.frequencia || "—"}</div>
                        <div><span className="text-muted-foreground">Supervisores:</span> {getSupervisoresNome(casaSelecionada)}</div>
                        <div><span className="text-muted-foreground">Condomínio:</span> {casaSelecionada.condominio || "—"}</div>
                      </div>
                      {casaSelecionada.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{casaSelecionada.address}, {casaSelecionada.numero} - {casaSelecionada.neighborhood}, {casaSelecionada.city}/{casaSelecionada.state}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Date Filter */}
                  <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onApply={() => {}}
                    onClear={clearFilters}
                  />

                  {/* Encontros Table */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Histórico de Encontros ({mergedEncontros.length})
                    </h3>
                    {loadingEncontros ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                      </div>
                    ) : mergedEncontros.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum encontro registrado
                      </div>
                    ) : (
                      <>
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
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedEncontros.map((encontro: any) => {
                                  const isBlank = encontro.is_blank;
                                  const isCancelled = !isBlank && encontro.reuniao_realizada === false;
                                  const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
                                  const blankCellClass = isBlank ? "text-destructive font-bold" : "";
                                  const cancelledCellClass = isCancelled ? "text-muted-foreground line-through" : "";
                                  return (
                                    <TableRow
                                      key={encontro.id}
                                      className={isBlank ? "bg-destructive/5 hover:bg-destructive/10" : isCancelled ? "bg-muted/30" : ""}
                                    >
                                      <TableCell className={`whitespace-nowrap ${isBlank ? "text-destructive font-bold" : isCancelled ? "font-medium text-muted-foreground" : "font-medium"}`}>
                                        {format(parseISO(encontro.data_encontro), "dd/MM/yyyy")}
                                        {isBlank && <span className="ml-2 text-xs">(pendente)</span>}
                                        {isCancelled && <span className="ml-2 text-xs">(não realizada)</span>}
                                      </TableCell>
                                      <TableCell className={`text-center ${isBlank ? blankCellClass : isCancelled ? cancelledCellClass : "text-blue-600"}`}>
                                        {isBlank || isCancelled ? "—" : encontro.qtd_lideres || 0}
                                      </TableCell>
                                      <TableCell className={`text-center ${isBlank ? blankCellClass : isCancelled ? cancelledCellClass : "text-green-600"}`}>
                                        {isBlank || isCancelled ? "—" : encontro.qtd_membros || 0}
                                      </TableCell>
                                      <TableCell className={`text-center ${isBlank ? blankCellClass : isCancelled ? cancelledCellClass : "text-purple-600"}`}>
                                        {isBlank || isCancelled ? "—" : encontro.qtd_visitantes || 0}
                                      </TableCell>
                                      <TableCell className={`text-center ${isBlank ? blankCellClass : isCancelled ? cancelledCellClass : "text-amber-600"}`}>
                                        {isBlank || isCancelled ? "—" : encontro.qtd_criancas || 0}
                                      </TableCell>
                                      <TableCell className={`text-center ${isBlank ? blankCellClass : isCancelled ? cancelledCellClass : "font-medium"}`}>
                                        {isBlank || isCancelled ? "—" : total}
                                      </TableCell>
                                      <TableCell className={`text-center ${blankCellClass} ${cancelledCellClass}`}>
                                        {isBlank || isCancelled ? "—" : encontro.kilos_arrecadados || 0}
                                      </TableCell>
                                      <TableCell className={`text-center whitespace-nowrap ${blankCellClass} ${cancelledCellClass}`}>
                                        {isBlank || isCancelled ? "—" : `R$ ${Number(encontro.ofertas || 0).toFixed(2).replace(".", ",")}`}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                          {isBlank ? (
                                            canEditSelected && (
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 text-destructive"
                                                  onClick={() => setPreScreenData({ dataEncontro: encontro.data_encontro })}
                                                  title="Preencher encontro"
                                                >
                                                  <Pencil className="w-4 h-4" />
                                                </Button>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Ações rápidas">
                                                      <XCircle className="w-4 h-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => quickCancelMutation.mutate({ dataEncontro: encontro.data_encontro, justificativa: "Não houve encontro" })}>
                                                      <XCircle className="w-4 h-4 mr-2" />
                                                      Não houve encontro
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => quickCancelMutation.mutate({ dataEncontro: encontro.data_encontro, justificativa: "Encontro transferido para a próxima semana" })}>
                                                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                      Encontro transferido
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </div>
                                            )
                                          ) : isCancelled ? (
                                            <span className="text-xs text-muted-foreground italic px-2" title={encontro.justificativa || ""}>
                                              {encontro.justificativa ? encontro.justificativa.slice(0, 30) + (encontro.justificativa.length > 30 ? "..." : "") : "Cancelada"}
                                            </span>
                                          ) : (
                                            <>
                                              {encontro.photo_url && (
                                                <>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAnaliseEncontro({ id: encontro.id, photoUrl: encontro.photo_url!, dataEncontro: encontro.data_encontro })} title="Analisar presença">
                                                    <ScanFace className="w-4 h-4 text-destructive" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPhoto(encontro.photo_url)} title="Ver foto">
                                                    <Image className="w-4 h-4" />
                                                  </Button>
                                                </>
                                              )}
                                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportEncontroPDF(encontro)} title="Exportar PDF">
                                                <FileDown className="w-4 h-4" />
                                              </Button>
                                              {canEditSelected && (
                                                <>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingEncontro(encontro)} title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingEncontroId(encontro.id)} title="Excluir">
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </Card>

                        {/* Pagination */}
                        {totalEncontrosPages > 1 && (
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-sm text-muted-foreground">
                              Página {encontrosPage} de {totalEncontrosPages}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEncontrosPage((p) => Math.max(1, p - 1))} disabled={encontrosPage === 1}>
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Anterior
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setEncontrosPage((p) => Math.min(totalEncontrosPages, p + 1))} disabled={encontrosPage === totalEncontrosPages}>
                                Próximo
                                <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
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
                        <p className="text-2xl font-bold">R$ {totalOfertas.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Ofertas</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Breakdown - Membros Vinculados */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-600">{indicadoresVinculados.lideres}</p>
                      <p className="text-xs text-muted-foreground">Líderes</p>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{indicadoresVinculados.membros}</p>
                      <p className="text-xs text-muted-foreground">Membros</p>
                    </div>
                    <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-amber-600">{indicadoresVinculados.criancas}</p>
                      <p className="text-xs text-muted-foreground">Crianças</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-purple-600">{indicadoresVinculados.visitantes}</p>
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

              {/* Pre-Screen Dialog */}
              {selectedCasa && casaSelecionada && preScreenData && (
                <EncontroPreScreenDialog
                  open={!!preScreenData}
                  onOpenChange={(isOpen) => !isOpen && setPreScreenData(null)}
                  dataEncontro={preScreenData.dataEncontro}
                  casaRefugioId={selectedCasa}
                  onProceedToReport={(justificativaMudanca) => {
                    setEditingEncontro({
                      isNew: true,
                      data_encontro: preScreenData.dataEncontro,
                      data_esperada: preScreenData.dataEncontro,
                      justificativa: justificativaMudanca || null,
                    });
                    setPreScreenData(null);
                    setShowEncontroDialog(true);
                  }}
                />
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

              {/* Photo Modal */}
              <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
                <DialogContent className="max-w-3xl p-2">
                  {selectedPhoto && (
                    <img src={selectedPhoto} alt="Foto do encontro" className="w-full h-auto rounded-lg" />
                  )}
                </DialogContent>
              </Dialog>

              {/* Analise Presenca Dialog */}
              {selectedCasa && analiseEncontro && (
                <AnalisePresencaDialog
                  open={!!analiseEncontro}
                  onOpenChange={(open) => !open && setAnaliseEncontro(null)}
                  encontroId={analiseEncontro.id}
                  casaRefugioId={selectedCasa}
                  photoUrl={analiseEncontro.photoUrl}
                  dataEncontro={analiseEncontro.dataEncontro}
                />
              )}

              {/* Dialog Confirmação Exclusão */}
              <AlertDialog open={!!deletingEncontroId} onOpenChange={() => setDeletingEncontroId(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir encontro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O registro do encontro será permanentemente removido.
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
      </TabsContent>
    </Tabs>
  );
};
