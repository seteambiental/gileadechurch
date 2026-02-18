import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { ArrowLeft, Loader2, Home, Users, Package, DollarSign, Calendar, MapPin, Image, ScanFace, Trash2, Pencil, FileDown, ChevronLeft, ChevronRight, XCircle, ArrowRightLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { useUserAccess } from "@/hooks/useUserAccess";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { format, isWithinInterval, addWeeks, startOfDay, isBefore, isAfter, getDay } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { DateRangeFilter } from "@/components/casas-refugio/DateRangeFilter";
import { EncontrosCharts } from "@/components/casas-refugio/EncontrosCharts";
import { MembrosVinculadosList } from "@/components/casas-refugio/MembrosVinculadosList";
import { VincularMembroDialog } from "@/components/casas-refugio/VincularMembroDialog";
import { AnalisePresencaDialog } from "@/components/casas-refugio/AnalisePresencaDialog";
import { EncontroFormDialog } from "@/components/casas-refugio/EncontroFormDialog";
import { EncontroPreScreenDialog } from "@/components/casas-refugio/EncontroPreScreenDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const CasaRefugioDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bypass = isAuthBypassed();
  const { isAdmin } = useUserAccess(user?.id);

  // Verificar se o usuário é líder do Ministério de Finanças
  const { data: isFinanceLeader = false } = useQuery({
    queryKey: ["is-finance-leader", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data: memberRows } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id);
      if (!memberRows || memberRows.length === 0) return false;
      const memberIds = memberRows.map((m) => m.id);
      const FINANCE_MINISTRY_ID = "cf8abff3-0268-41d0-be3b-ff4540a886ac";
      const { data: funcs } = await supabase
        .from("member_functions")
        .select("id")
        .in("member_id", memberIds)
        .eq("function_type", "lider_ministerio")
        .eq("ministry_id", FINANCE_MINISTRY_ID)
        .limit(1);
      return !!funcs && funcs.length > 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const canConferir = isAdmin || isFinanceLeader;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [encontrosPage, setEncontrosPage] = useState(1);
  const ENCONTROS_PER_PAGE = 5;
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [analiseEncontro, setAnaliseEncontro] = useState<{
    id: string;
    photoUrl: string;
    dataEncontro: string;
  } | null>(null);
  const [editingEncontro, setEditingEncontro] = useState<any>(null);
  const [deletingEncontroId, setDeletingEncontroId] = useState<string | null>(null);
  const [preScreenData, setPreScreenData] = useState<{ dataEncontro: string } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: casa, isLoading: loadingCasa } = useQuery({
    queryKey: ["casa-refugio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select(`
          *,
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name),
          supervisor_esposa:members!casas_refugio_supervisor_esposa_id_fkey(full_name),
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name),
          anfitriao:members!casas_refugio_anfitriao_id_fkey(full_name),
          anfitriao_esposa:members!casas_refugio_anfitriao_esposa_id_fkey(full_name)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: encontros = [], isLoading: loadingEncontros } = useQuery({
    queryKey: ["encontros-casa", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .eq("casa_refugio_id", id)
        .order("data_encontro", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Buscar membros vinculados para indicadores de cadastro
  const { data: membrosVinculados = [] } = useQuery({
    queryKey: ["membros-vinculados-stats", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, birth_date")
        .eq("casa_refugio_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Calcular líderes, membros (excluindo líderes) e crianças vinculados
  const indicadoresVinculados = useMemo(() => {
    const hoje = new Date();
    
    // IDs dos líderes
    const liderIds = [casa?.lider_id, casa?.lider_esposa_id].filter(Boolean);
    const qtdLideres = liderIds.length;
    
    let membrosAdultos = 0;
    let criancas = 0;
    
    membrosVinculados.forEach((m) => {
      // Se for líder, não conta como membro
      if (liderIds.includes(m.id)) return;
      
      if (m.birth_date) {
        const nascimento = parseLocalDate(m.birth_date);
        const idade = Math.floor((hoje.getTime() - nascimento.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (idade < 12) {
          criancas++;
        } else {
          membrosAdultos++;
        }
      } else {
        membrosAdultos++; // Sem data de nascimento, considera adulto
      }
    });
    
    return { 
      lideres: qtdLideres, 
      membros: membrosAdultos, 
      criancas, 
      visitantes: 0, // Visitantes não são vinculados
      total: membrosVinculados.length 
    };
  }, [membrosVinculados, casa]);

  // Map Portuguese day names to JS day numbers (0=Sun, 1=Mon, ...)
  const dayNameToNumber = (dia: string): number | null => {
    const map: Record<string, number> = {
      "domingo": 0, "segunda": 1, "terça": 2, "terca": 2,
      "quarta": 3, "quinta": 4, "sexta": 5, "sábado": 6, "sabado": 6,
    };
    // Normalize: lowercase, remove accents, remove "-feira" suffix
    const normalized = dia.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace("-feira", "")
      .trim();
    return map[normalized] ?? null;
  };

  // Generate expected encounter dates based on casa config
  const mergedEncontros = useMemo(() => {
    if (!casa) return encontros.map((e) => ({ ...e, is_blank: false }));

    const diaNum = casa.dias ? dayNameToNumber(casa.dias) : null;
    const isQuinzenal = casa.frequencia?.toLowerCase() === "quinzenal";
    const isSemanal = casa.frequencia?.toLowerCase() === "semanal";

    if (diaNum === null || (!isSemanal && !isQuinzenal)) {
      return encontros.map((e) => ({ ...e, is_blank: false }));
    }

    // Use data_inicio_cr if set, otherwise fallback to Feb 1, 2026
    const startGen = casa.data_inicio_cr 
      ? parseLocalDate(casa.data_inicio_cr) 
      : new Date(2026, 1, 1);
    const today = startOfDay(new Date());

    // Find the first occurrence of the target day on or after startGen
    let current = new Date(startGen);
    while (getDay(current) !== diaNum) {
      current.setDate(current.getDate() + 1);
    }

    const expectedDates: string[] = [];
    const weekIncrement = isQuinzenal ? 2 : 1;

    while (!isAfter(current, today)) {
      const dateStr = format(current, "yyyy-MM-dd");
      expectedDates.push(dateStr);
      current = addWeeks(current, weekIncrement);
    }

    // Create a map of actual encontros by data_esperada (preferred) or data_encontro
    const encontrosByExpectedDate = new Map<string, typeof encontros[0]>();
    const matchedExpectedDates = new Set<string>();
    
    encontros.forEach((e) => {
      const key = e.data_esperada || e.data_encontro;
      encontrosByExpectedDate.set(key, e);
    });

    // Merge: for each expected date, use actual (matched by data_esperada) or create blank
    const merged = expectedDates.map((dateStr) => {
      const actual = encontrosByExpectedDate.get(dateStr);
      if (actual) {
        matchedExpectedDates.add(dateStr);
        return { ...actual, is_blank: false, display_date: actual.data_encontro };
      }
      return {
        id: `blank-${dateStr}`,
        casa_refugio_id: id!,
        data_encontro: dateStr,
        data_esperada: dateStr,
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
        created_at: "",
        updated_at: "",
        reuniao_realizada: true,
        justificativa: null,
        is_blank: true,
        display_date: dateStr,
      };
    });

    // Also include any actual encontros whose data_esperada doesn't match any expected date
    // (e.g. manually created encontros without expected date tracking)
    encontros.forEach((e) => {
      const key = e.data_esperada || e.data_encontro;
      if (!matchedExpectedDates.has(key) && !expectedDates.includes(key)) {
        merged.push({ ...e, is_blank: false, display_date: e.data_encontro });
      }
    });

    // Sort descending by date
    merged.sort((a, b) => b.data_encontro.localeCompare(a.data_encontro));

    return merged;
  }, [encontros, casa, id]);

  // Filter merged encontros by date range
  const filteredEncontros = useMemo(() => {
    if (!startDate && !endDate) return mergedEncontros;

    return mergedEncontros.filter((encontro) => {
      const encontroDate = parseLocalDate(encontro.data_encontro);

      if (startDate && endDate) {
        return isWithinInterval(encontroDate, {
          start: parseLocalDate(startDate),
          end: parseLocalDate(endDate),
        });
      }

      if (startDate) {
        return encontroDate >= parseLocalDate(startDate);
      }

      if (endDate) {
        return encontroDate <= parseLocalDate(endDate);
      }

      return true;
    });
  }, [mergedEncontros, startDate, endDate]);

  // Calculate indicators from filtered data (only non-blank)
  const realEncontros = filteredEncontros.filter((e) => !e.is_blank && e.reuniao_realizada !== false);
  const totalEncontros = realEncontros.length;
  const totalLideres = realEncontros.reduce((acc, e) => acc + (e.qtd_lideres || 0), 0);
  const totalMembros = realEncontros.reduce((acc, e) => acc + (e.qtd_membros || 0), 0);
  const totalCriancas = realEncontros.reduce((acc, e) => acc + (e.qtd_criancas || 0), 0);
  const totalVisitantes = realEncontros.reduce((acc, e) => acc + (e.qtd_visitantes || 0), 0);
  const totalPessoas = totalLideres + totalMembros + totalCriancas + totalVisitantes;
  const totalKilos = realEncontros.reduce((acc, e) => acc + Number(e.kilos_arrecadados || 0), 0);
  const totalOfertas = realEncontros.reduce((acc, e) => acc + Number(e.ofertas || 0), 0);
  const mediaPessoas = totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0;

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setEncontrosPage(1);
  };

  // Pagination
  const totalEncontrosPages = Math.ceil(filteredEncontros.length / ENCONTROS_PER_PAGE);
  const paginatedEncontros = filteredEncontros.slice(
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
      queryClient.invalidateQueries({ queryKey: ["encontros-casa", id] });
      toast.success("Encontro excluído com sucesso!");
      setDeletingEncontroId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir encontro");
    },
  });

  // Toggle conferido
  const conferidoMutation = useMutation({
    mutationFn: async ({ encontroId, conferido }: { encontroId: string; conferido: boolean }) => {
      const { error } = await supabase
        .from("encontros_casa_refugio")
        .update({
          conferido,
          conferido_em: conferido ? new Date().toISOString() : null,
        } as any)
        .eq("id", encontroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros-casa", id] });
      toast.success("Status de conferência atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar conferência");
    },
  });

  // Quick action: mark as "não houve encontro" or "transferido"
  const quickCancelMutation = useMutation({
    mutationFn: async ({ dataEncontro, justificativa }: { dataEncontro: string; justificativa: string }) => {
      const { error } = await supabase.from("encontros_casa_refugio").insert({
        casa_refugio_id: id!,
        data_encontro: dataEncontro,
        data_esperada: dataEncontro,
        reuniao_realizada: false,
        justificativa,
        qtd_lideres: 0,
        qtd_membros: 0,
        qtd_criancas: 0,
        qtd_visitantes: 0,
        kilos_arrecadados: 0,
        ofertas: 0,
        ofertas_dinheiro: 0,
        ofertas_pix: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros-casa", id] });
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast.success("Registro salvo com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  // Reactivate cancelled meeting (delete the cancelled record so it returns to "pendente")
  const reactivateMutation = useMutation({
    mutationFn: async (encontroId: string) => {
      const { error } = await supabase
        .from("encontros_casa_refugio")
        .delete()
        .eq("id", encontroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros-casa", id] });
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast.success("Reunião reativada! Agora pode ser preenchida normalmente.");
    },
    onError: (error) => {
      toast.error("Erro ao reativar: " + error.message);
    },
  });

  const exportEncontroPDF = async (encontro: any) => {
    const doc = new jsPDF();
    const total = (encontro.qtd_lideres || 0) + (encontro.qtd_membros || 0) + (encontro.qtd_criancas || 0) + (encontro.qtd_visitantes || 0);
    const dataFormatada = format(parseLocalDate(encontro.data_encontro), "dd/MM/yyyy");
    
    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DA CASA REFÚGIO", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(`${casa?.name?.toUpperCase() || ""}`, 105, 30, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Data: ${dataFormatada}`, 105, 40, { align: "center" });
    
    let startY = 55;
    
    // Add photo if exists
    if (encontro.photo_url) {
      try {
        // Load image using HTMLImageElement
        const img = document.createElement("img") as HTMLImageElement;
        img.crossOrigin = "anonymous";
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const maxWidth = 180;
            const maxHeight = 100;
            let width = img.width;
            let height = img.height;
            
            // Scale to fit
            if (width > maxWidth) {
              height = (maxWidth / width) * height;
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = (maxHeight / height) * width;
              height = maxHeight;
            }
            
            const x = (210 - width) / 2; // Center horizontally
            doc.addImage(img, "JPEG", x, startY, width, height);
            startY += height + 10;
            resolve();
          };
          img.onerror = () => {
            // Continue without image if loading fails
            resolve();
          };
          img.src = encontro.photo_url;
        });
      } catch (error) {
        console.error("Error loading image for PDF:", error);
      }
    }
    
    // Table with data
    autoTable(doc, {
      startY: startY,
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
      columnStyles: {
        0: { fontStyle: "bold" },
      },
    });
    
    if (encontro.observacoes) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(10);
      doc.text(`Observações: ${encontro.observacoes}`, 14, finalY + 10);
    }
    
    doc.save(`encontro-${format(parseLocalDate(encontro.data_encontro), "yyyy-MM-dd")}.pdf`);
  };

  if (authLoading || loadingCasa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  if (!casa) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">Casa Refúgio não encontrada</h1>
          <Button onClick={() => navigate("/ministerio/casas-refugio")}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">{casa.name}</h1>
              <p className="text-xs text-muted-foreground">{casa.condominio}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const params = searchParams.toString();
              navigate(`/ministerio/casas-refugio${params ? `?${params}` : ""}`);
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">{casa.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {[casa.lider?.full_name, casa.lider_esposa?.full_name].filter(Boolean).join(" e ") || casa.lideres || "—"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Anfitriões: </span>
                {[casa.anfitriao?.full_name, casa.anfitriao_esposa?.full_name].filter(Boolean).join(" e ") || casa.anfitrioes || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Supervisores: </span>
                {[casa.supervisor?.full_name, casa.supervisor_esposa?.full_name].filter(Boolean).join(" e ") || casa.supervisores || "—"}
              </div>
              <div><span className="text-muted-foreground">Dias:</span> {casa.dias || "—"}</div>
              <div><span className="text-muted-foreground">Frequência:</span> {casa.frequencia || "—"}</div>
            </div>
            {casa.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{casa.address}, {casa.numero} - {casa.neighborhood}, {casa.city}/{casa.state} - CEP: {casa.cep}</span>
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

        {/* Encontros Table - right after date filter */}
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Histórico de Encontros ({filteredEncontros.length})
          </h3>
          {loadingEncontros ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-destructive animate-spin" />
            </div>
          ) : filteredEncontros.length === 0 ? (
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
                        <TableHead className="text-center">Conf.</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEncontros.map((encontro) => {
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
                              {format(parseLocalDate(encontro.data_encontro), "dd/MM/yyyy")}
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
                            <TableCell className="text-center">
                              {isBlank || isCancelled ? "—" : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 ${(encontro as any).conferido ? "text-green-600" : "text-muted-foreground/30"}`}
                                  onClick={() => {
                                    if (!canConferir) {
                                      toast.error("Apenas os líderes do Ministério de Finanças podem conferir encontros.");
                                      return;
                                    }
                                    conferidoMutation.mutate({
                                      encontroId: encontro.id,
                                      conferido: !(encontro as any).conferido,
                                    });
                                  }}
                                  title={(encontro as any).conferido ? (canConferir ? "Clique para desmarcar conferido" : "Conferido") : (canConferir ? "Marcar como conferido" : "Apenas líderes de Finanças podem conferir")}
                                  disabled={conferidoMutation.isPending}
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {isBlank ? (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => setPreScreenData({
                                        dataEncontro: encontro.data_encontro,
                                      })}
                                      title="Preencher encontro"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground"
                                          title="Ações rápidas"
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => quickCancelMutation.mutate({
                                            dataEncontro: encontro.data_encontro,
                                            justificativa: "Não houve encontro",
                                          })}
                                        >
                                          <XCircle className="w-4 h-4 mr-2" />
                                          Não houve encontro
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => quickCancelMutation.mutate({
                                            dataEncontro: encontro.data_encontro,
                                            justificativa: "Encontro transferido para a próxima semana",
                                          })}
                                        >
                                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                                          Encontro transferido
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                ) : isCancelled ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground italic" title={encontro.justificativa || ""}>
                                      {encontro.justificativa ? encontro.justificativa.slice(0, 20) + (encontro.justificativa.length > 20 ? "..." : "") : "Cancelada"}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-amber-600 hover:text-amber-700"
                                      onClick={() => reactivateMutation.mutate(encontro.id)}
                                      disabled={reactivateMutation.isPending}
                                      title="Reativar reunião"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    {encontro.photo_url && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setAnaliseEncontro({
                                            id: encontro.id,
                                            photoUrl: encontro.photo_url!,
                                            dataEncontro: encontro.data_encontro,
                                          })}
                                          title="Analisar presença"
                                        >
                                          <ScanFace className="w-4 h-4 text-destructive" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setSelectedPhoto(encontro.photo_url)}
                                          title="Ver foto"
                                        >
                                          <Image className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => exportEncontroPDF(encontro)}
                                      title="Exportar PDF"
                                    >
                                      <FileDown className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setEditingEncontro(encontro)}
                                      title="Editar"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeletingEncontroId(encontro.id)}
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEncontrosPage((p) => Math.max(1, p - 1))}
                      disabled={encontrosPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
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
                </div>
              )}
            </>
          )}
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalEncontros}</p>
              <p className="text-xs text-muted-foreground">Encontros</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{mediaPessoas}</p>
              <p className="text-xs text-muted-foreground">Média/Encontro</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalKilos}</p>
              <p className="text-xs text-muted-foreground">Kilos Total</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">R$ {totalOfertas.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-muted-foreground">Ofertas Total</p>
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
        {id && casa && (
          <MembrosVinculadosList
            casaRefugioId={id}
            onVincularClick={() => setShowVincularDialog(true)}
          />
        )}

        {/* Charts */}
        <EncontrosCharts encontros={filteredEncontros} />

      </main>

      {/* Photo Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Foto do encontro"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Analise Presenca Dialog */}
      {id && analiseEncontro && (
        <AnalisePresencaDialog
          open={!!analiseEncontro}
          onOpenChange={(open) => !open && setAnaliseEncontro(null)}
          encontroId={analiseEncontro.id}
          casaRefugioId={id}
          photoUrl={analiseEncontro.photoUrl}
          dataEncontro={analiseEncontro.dataEncontro}
        />
      )}

      {/* Vincular Membro Dialog */}
      {id && casa && (
        <VincularMembroDialog
          open={showVincularDialog}
          onOpenChange={setShowVincularDialog}
          casaRefugioId={id}
          casaRefugioName={casa.name}
        />
      )}

      {/* Pre-Screen Dialog */}
      {id && preScreenData && (
        <EncontroPreScreenDialog
          open={!!preScreenData}
          onOpenChange={(open) => !open && setPreScreenData(null)}
          dataEncontro={preScreenData.dataEncontro}
          casaRefugioId={id}
          onProceedToReport={(justificativaMudanca) => {
            setEditingEncontro({
              isNew: true,
              data_encontro: preScreenData.dataEncontro,
              data_esperada: preScreenData.dataEncontro,
              justificativa: justificativaMudanca || null,
            });
            setPreScreenData(null);
          }}
        />
      )}

      {/* Edit Encontro Dialog */}
      {casa && editingEncontro && (
        <EncontroFormDialog
          open={!!editingEncontro}
          onOpenChange={(open) => !open && setEditingEncontro(null)}
          casa={casa}
          editingEncontro={editingEncontro}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingEncontroId} onOpenChange={() => setDeletingEncontroId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este encontro? Esta ação não pode ser desfeita.
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

export default CasaRefugioDetalhes;
