import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Download, FileSpreadsheet, FileText, Calendar, Filter, Building, Home, UserCheck, ChevronLeft, ChevronRight, Columns3, ListFilter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateBR } from "@/lib/masks";
import { exportGenericToExcel, exportGenericToPDF, ExportColumn, ExportRowStyle } from "@/lib/export";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";

interface CasaRefugioData {
  id: string;
  name: string;
  condominio: string | null;
  dias: string | null;
  frequencia: string | null;
  data_inicio_cr: string | null;
  supervisor?: { full_name: string } | null;
  lider?: { full_name: string } | null;
  lider_esposa?: { full_name: string } | null;
}

interface EncontrosReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EncontroReport {
  casa_refugio_id: string;
  casa_nome: string;
  condominio: string;
  lideres: string;
  data_encontro: string;
  qtd_lideres: number;
  qtd_membros: number;
  qtd_criancas: number;
  qtd_visitantes: number;
  total_presentes: number;
  ofertas_dinheiro: number;
  ofertas_pix: number;
  ofertas_total: number;
  kilos_arrecadados: number;
  is_blank: boolean;
  is_cancelled: boolean;
  conferido: boolean;
}

const ITEMS_PER_PAGE = 5;

// Map day name to JS day number (0=Sunday, 1=Monday, etc.)
const dayNameToNumber: Record<string, number> = {
  "Domingo": 0,
  "Segunda-feira": 1,
  "Terça-feira": 2,
  "Quarta-feira": 3,
  "Quinta-feira": 4,
  "Sexta-feira": 5,
  "Sábado": 6,
};

const generateExpectedDates = (
  startDate: string,
  endDate: string,
  dayOfWeek: number,
  frequencia?: string | null,
  dataInicioCr?: string | null
): string[] => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (start > end) return [];

  const isQuinzenal = frequencia?.toLowerCase() === "quinzenal";

  if (!isQuinzenal) {
    // Semanal: every matching day of week
    const allDays = eachDayOfInterval({ start, end });
    return allDays
      .filter((d) => getDay(d) === dayOfWeek)
      .map((d) => format(d, "yyyy-MM-dd"));
  }

  // Quinzenal: anchor from data_inicio_cr and step by 2 weeks
  const anchor = dataInicioCr ? parseLocalDate(dataInicioCr) : start;
  let current = new Date(anchor);
  // Find first occurrence of target day on or after anchor
  while (getDay(current) !== dayOfWeek) {
    current.setDate(current.getDate() + 1);
  }

  const dates: string[] = [];
  while (current <= end) {
    if (current >= start) {
      dates.push(format(current, "yyyy-MM-dd"));
    }
    current.setDate(current.getDate() + 14); // 2 weeks
  }
  return dates;
};

export const EncontrosReportDialog = ({
  open,
  onOpenChange,
}: EncontrosReportDialogProps) => {
  // Default: February 2026
  const defaultStartDate = "2026-02-01";
  const defaultEndDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [appliedStartDate, setAppliedStartDate] = useState(defaultStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultEndDate);

  // Filters
  const [condominioFilter, setCondominioFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [casaRefugioFilter, setCasaRefugioFilter] = useState("all");

  // Status filter
  const [statusFilter, setStatusFilter] = useState<"todas" | "realizadas" | "pendentes">("todas");

  // Column visibility
  const allColumns = [
    { key: "casa_nome", label: "Casa Refúgio", default: true },
    { key: "condominio", label: "Condomínio", default: true },
    { key: "lideres", label: "Líderes da CR", default: true },
    { key: "data_encontro", label: "Data", default: true },
    { key: "conferido", label: "Conferido", default: true },
    { key: "qtd_lideres", label: "Qtd. Líderes", default: true },
    { key: "qtd_membros", label: "Membros", default: true },
    { key: "qtd_criancas", label: "Crianças", default: true },
    { key: "qtd_visitantes", label: "Visitantes", default: true },
    { key: "total_presentes", label: "Total", default: true },
    { key: "ofertas_dinheiro", label: "R$ Dinheiro", default: true },
    { key: "ofertas_pix", label: "R$ Pix", default: true },
    { key: "ofertas_total", label: "R$ Total", default: true },
    { key: "kilos_arrecadados", label: "Kilos", default: true },
  ] as const;


  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(allColumns.map((c) => c.key))
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isColumnVisible = (key: string) => visibleColumns.has(key);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setSupervisorFilter("all");
    setCasaRefugioFilter("all");
  }, [condominioFilter]);

  useEffect(() => {
    setCasaRefugioFilter("all");
  }, [supervisorFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [condominioFilter, supervisorFilter, casaRefugioFilter, appliedStartDate, appliedEndDate]);

  // Fetch all casas refugio for filters
  const getFirstName = (fullName: string | null | undefined): string => {
    if (!fullName) return "";
    return fullName.split(" ")[0];
  };

  const getLideresDisplay = (casa: CasaRefugioData): string => {
    const names = [
      getFirstName(casa.lider?.full_name),
      getFirstName(casa.lider_esposa?.full_name),
    ].filter(Boolean);
    return names.join(" e ") || "-";
  };

  const { data: allCasas = [] } = useQuery({
    queryKey: ["casas-refugio-report-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select(`
          id,
          name,
          condominio,
          dias,
          frequencia,
          data_inicio_cr,
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name),
          lider:members!casas_refugio_lider_id_fkey(full_name),
          lider_esposa:members!casas_refugio_lider_esposa_id_fkey(full_name)
        `)
        .order("name");
      if (error) throw error;
      return data as CasaRefugioData[];
    },
    enabled: open,
  });

  // Build filter options
  const condominios = useMemo(() => {
    const unique = [...new Set(allCasas.map((c) => c.condominio).filter(Boolean))];
    return unique.sort() as string[];
  }, [allCasas]);

  const supervisores = useMemo(() => {
    const filteredCasas = condominioFilter === "all"
      ? allCasas
      : allCasas.filter((c) => c.condominio === condominioFilter);
    const map = new Map<string, string>();
    filteredCasas.forEach((casa) => {
      if (casa.supervisor?.full_name) {
        map.set(casa.supervisor.full_name, casa.supervisor.full_name);
      }
    });
    return Array.from(map.values()).sort();
  }, [allCasas, condominioFilter]);

  const casasFiltradasParaSelect = useMemo(() => {
    let filtered = allCasas;
    if (condominioFilter !== "all") {
      filtered = filtered.filter((c) => c.condominio === condominioFilter);
    }
    if (supervisorFilter !== "all") {
      filtered = filtered.filter((c) => c.supervisor?.full_name === supervisorFilter);
    }
    return filtered;
  }, [allCasas, condominioFilter, supervisorFilter]);

  // Final filtered casa IDs for query
  const filteredCasaIds = useMemo(() => {
    if (casaRefugioFilter !== "all") {
      return [casaRefugioFilter];
    }
    return casasFiltradasParaSelect.map((c) => c.id);
  }, [casasFiltradasParaSelect, casaRefugioFilter]);

  // Map of casa data
  const casasMap = useMemo(() => {
    const map = new Map<string, CasaRefugioData>();
    allCasas.forEach((casa) => map.set(casa.id, casa));
    return map;
  }, [allCasas]);

  const { data: encontros = [], isLoading } = useQuery({
    queryKey: ["encontros-report", filteredCasaIds, appliedStartDate, appliedEndDate],
    queryFn: async () => {
      if (filteredCasaIds.length === 0) return [];

      let query = supabase
        .from("encontros_casa_refugio")
        .select("*")
        .in("casa_refugio_id", filteredCasaIds)
        .order("data_encontro", { ascending: true });

      if (appliedStartDate) {
        query = query.gte("data_encontro", appliedStartDate);
      }
      if (appliedEndDate) {
        query = query.lte("data_encontro", appliedEndDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open && filteredCasaIds.length > 0,
  });

  const reportData: EncontroReport[] = useMemo(() => {
    // Build maps of existing encontros indexed by both data_esperada and data_encontro
    // This ensures we find the match regardless of whether the actual date differs from expected
    const byExpectedDate = new Map<string, typeof encontros[0]>();
    const byActualDate = new Map<string, typeof encontros[0]>();
    const usedEncontroIds = new Set<string>();

    encontros.forEach((e) => {
      const expectedDate = (e as any).data_esperada || e.data_encontro;
      const keyExpected = `${e.casa_refugio_id}_${expectedDate}`;
      const keyActual = `${e.casa_refugio_id}_${e.data_encontro}`;
      // For duplicates, last one wins (query is ordered ASC, so latest created_at wins)
      byExpectedDate.set(keyExpected, e);
      byActualDate.set(keyActual, e);
    });

    const findEncontro = (casaId: string, expectedDate: string) => {
      // First try by data_esperada match
      const byExpected = byExpectedDate.get(`${casaId}_${expectedDate}`);
      if (byExpected && !usedEncontroIds.has(byExpected.id)) return byExpected;
      // Fallback: try by data_encontro match (when actual date matches expected slot)
      const byActual = byActualDate.get(`${casaId}_${expectedDate}`);
      if (byActual && !usedEncontroIds.has(byActual.id)) return byActual;
      return null;
    };

    const rows: EncontroReport[] = [];

    // For each filtered casa, generate expected dates and merge with existing
    const casasToProcess = casaRefugioFilter !== "all"
      ? allCasas.filter((c) => c.id === casaRefugioFilter)
      : casasFiltradasParaSelect;

    casasToProcess.forEach((casa) => {
      const dayNumber = casa.dias ? dayNameToNumber[casa.dias] : null;
      if (dayNumber === null || dayNumber === undefined) return;

      // Skip CRs without data_inicio_cr
      if (!casa.data_inicio_cr) return;

      // Use data_inicio_cr as start, but clamp to appliedStartDate
      const casaStart = casa.data_inicio_cr > appliedStartDate 
        ? casa.data_inicio_cr 
        : appliedStartDate;
      const expectedDates = generateExpectedDates(casaStart, appliedEndDate, dayNumber, casa.frequencia, casa.data_inicio_cr);

      expectedDates.forEach((date) => {
        const existing = findEncontro(casa.id, date);
        if (existing) usedEncontroIds.add(existing.id);

        if (existing) {
          rows.push({
            casa_refugio_id: casa.id,
            casa_nome: casa.name,
            condominio: casa.condominio || "-",
            lideres: getLideresDisplay(casa),
            data_encontro: existing.data_encontro,
            qtd_lideres: existing.qtd_lideres || 0,
            qtd_membros: existing.qtd_membros || 0,
            qtd_criancas: existing.qtd_criancas || 0,
            qtd_visitantes: existing.qtd_visitantes || 0,
            total_presentes:
              (existing.qtd_lideres || 0) +
              (existing.qtd_membros || 0) +
              (existing.qtd_criancas || 0) +
              (existing.qtd_visitantes || 0),
            ofertas_dinheiro: Number(existing.ofertas_dinheiro || 0),
            ofertas_pix: Number(existing.ofertas_pix || 0),
            ofertas_total: Number(existing.ofertas || 0),
            kilos_arrecadados: Number(existing.kilos_arrecadados || 0),
            is_blank: false,
            is_cancelled: existing.reuniao_realizada === false,
            conferido: !!(existing as any).conferido,
          });
        } else {
          rows.push({
            casa_refugio_id: casa.id,
            casa_nome: casa.name,
            condominio: casa.condominio || "-",
            lideres: getLideresDisplay(casa),
            data_encontro: date,
            qtd_lideres: 0,
            qtd_membros: 0,
            qtd_criancas: 0,
            qtd_visitantes: 0,
            total_presentes: 0,
            ofertas_dinheiro: 0,
            ofertas_pix: 0,
            ofertas_total: 0,
            kilos_arrecadados: 0,
            is_blank: true,
            is_cancelled: false,
            conferido: false,
          });
        }
      });
    });

    // Also add encontros that weren't matched to any expected date slot
    encontros.forEach((e) => {
      if (usedEncontroIds.has(e.id)) return;
      const casa = casasMap.get(e.casa_refugio_id);
      if (!casa) return;
      rows.push({
        casa_refugio_id: e.casa_refugio_id,
        casa_nome: casa.name,
        condominio: casa.condominio || "-",
        lideres: getLideresDisplay(casa),
        data_encontro: e.data_encontro,
        qtd_lideres: e.qtd_lideres || 0,
        qtd_membros: e.qtd_membros || 0,
        qtd_criancas: e.qtd_criancas || 0,
        qtd_visitantes: e.qtd_visitantes || 0,
        total_presentes:
          (e.qtd_lideres || 0) + (e.qtd_membros || 0) + (e.qtd_criancas || 0) + (e.qtd_visitantes || 0),
        ofertas_dinheiro: Number(e.ofertas_dinheiro || 0),
        ofertas_pix: Number(e.ofertas_pix || 0),
        ofertas_total: Number(e.ofertas || 0),
        kilos_arrecadados: Number(e.kilos_arrecadados || 0),
        is_blank: false,
        is_cancelled: (e as any).reuniao_realizada === false,
        conferido: !!(e as any).conferido,
      });
    });

    // Sort by casa name (alphabetical) then date
    rows.sort((a, b) => {
      const casaCompare = a.casa_nome.localeCompare(b.casa_nome);
      if (casaCompare !== 0) return casaCompare;
      return a.data_encontro.localeCompare(b.data_encontro);
    });

    return rows;
  }, [encontros, allCasas, casasFiltradasParaSelect, casaRefugioFilter, appliedStartDate, appliedEndDate, casasMap]);

  // Apply status filter
  const filteredReportData = useMemo(() => {
    if (statusFilter === "realizadas") return reportData.filter((r) => !r.is_blank);
    if (statusFilter === "pendentes") return reportData.filter((r) => r.is_blank);
    return reportData;
  }, [reportData, statusFilter]);

  // Totals (only non-blank from filtered data)
  const totals = useMemo(() => {
    return filteredReportData
      .filter((r) => !r.is_blank && !r.is_cancelled)
      .reduce(
        (acc, row) => ({
          qtd_lideres: acc.qtd_lideres + row.qtd_lideres,
          qtd_membros: acc.qtd_membros + row.qtd_membros,
          qtd_criancas: acc.qtd_criancas + row.qtd_criancas,
          qtd_visitantes: acc.qtd_visitantes + row.qtd_visitantes,
          total_presentes: acc.total_presentes + row.total_presentes,
          ofertas_dinheiro: acc.ofertas_dinheiro + row.ofertas_dinheiro,
          ofertas_pix: acc.ofertas_pix + row.ofertas_pix,
          ofertas_total: acc.ofertas_total + row.ofertas_total,
          kilos_arrecadados: acc.kilos_arrecadados + row.kilos_arrecadados,
        }),
        {
          qtd_lideres: 0,
          qtd_membros: 0,
          qtd_criancas: 0,
          qtd_visitantes: 0,
          total_presentes: 0,
          ofertas_dinheiro: 0,
          ofertas_pix: 0,
          ofertas_total: 0,
          kilos_arrecadados: 0,
        }
      );
  }, [filteredReportData]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredReportData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredReportData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleClearFilter = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setAppliedStartDate(defaultStartDate);
    setAppliedEndDate(defaultEndDate);
    setCondominioFilter("all");
    setSupervisorFilter("all");
    setCasaRefugioFilter("all");
    setStatusFilter("todas");
  };

  const exportColumns: ExportColumn[] = [
    { header: "Casa Refúgio", accessor: "casa_nome" },
    { header: "Condomínio", accessor: "condominio" },
    { header: "Líderes da CR", accessor: "lideres" },
    { 
      header: "Data do Encontro", 
      accessor: "data_encontro",
      format: (value) => formatDateBR(value),
    },
    { header: "Status", accessor: (row) => row.is_blank ? "Pendente" : row.is_cancelled ? "Não realizada" : "Preenchido" },
    { header: "Conferido", accessor: (row) => row.conferido ? "Sim" : "Não" },
    { header: "Qtd. Líderes", accessor: "qtd_lideres", type: 'number' },
    { header: "Membros", accessor: "qtd_membros", type: 'number' },
    { header: "Crianças", accessor: "qtd_criancas", type: 'number' },
    { header: "Visitantes", accessor: "qtd_visitantes", type: 'number' },
    { header: "Total Presentes", accessor: "total_presentes", type: 'number' },
    { 
      header: "Ofertas Dinheiro", 
      accessor: "ofertas_dinheiro",
      type: 'currency',
    },
    { 
      header: "Ofertas PIX", 
      accessor: "ofertas_pix",
      type: 'currency',
    },
    { 
      header: "Ofertas Total", 
      accessor: "ofertas_total",
      type: 'currency',
    },
    { 
      header: "Kilos Arrecadados", 
      accessor: "kilos_arrecadados",
      type: 'number',
      format: (value) => `${Number(value).toFixed(1)}`,
    },
  ];

  // Column key to export column mapping (respects visible columns selection)
  const columnKeyToExportHeader: Record<string, string> = {
    casa_nome: "Casa Refúgio",
    condominio: "Condomínio",
    lideres: "Líderes da CR",
    data_encontro: "Data do Encontro",
    conferido: "Conferido",
    qtd_lideres: "Qtd. Líderes",
    qtd_membros: "Membros",
    qtd_criancas: "Crianças",
    qtd_visitantes: "Visitantes",
    total_presentes: "Total Presentes",
    ofertas_dinheiro: "Ofertas Dinheiro",
    ofertas_pix: "Ofertas PIX",
    ofertas_total: "Ofertas Total",
    kilos_arrecadados: "Kilos Arrecadados",
  };

  const filteredExportColumns = exportColumns.filter((col) => {
    // Always include Status column
    if (col.header === "Status") return true;
    // Find matching column key by header
    const matchingKey = Object.entries(columnKeyToExportHeader).find(
      ([, header]) => header === col.header
    )?.[0];
    return matchingKey ? visibleColumns.has(matchingKey) : true;
  });

  const handleExcelExport = async () => {
    const periodLabel = appliedStartDate && appliedEndDate 
      ? `${formatDateBR(appliedStartDate)}-${formatDateBR(appliedEndDate)}` 
      : "todos";
    
    // Add totals row to exported data
    const dataWithTotals = [
      ...filteredReportData,
      {
        casa_refugio_id: "",
        casa_nome: "TOTAL",
        condominio: "",
        lideres: "",
        data_encontro: "",
        qtd_lideres: totals.qtd_lideres,
        qtd_membros: totals.qtd_membros,
        qtd_criancas: totals.qtd_criancas,
        qtd_visitantes: totals.qtd_visitantes,
        total_presentes: totals.total_presentes,
        ofertas_dinheiro: totals.ofertas_dinheiro,
        ofertas_pix: totals.ofertas_pix,
        ofertas_total: totals.ofertas_total,
        kilos_arrecadados: totals.kilos_arrecadados,
        is_blank: false,
        is_cancelled: false,
        conferido: false,
      },
    ];
    
    const blankRowStyle = (row: any): ExportRowStyle | null => {
      if (row.is_blank) return { fillColor: "#D9D9D9", fontColor: "#666666", italic: true };
      if (row.is_cancelled) return { fillColor: "#E8E8E8", fontColor: "#999999", italic: true };
      return null;
    };

    await exportGenericToExcel(
      dataWithTotals,
      filteredExportColumns,
      `relatorio-encontros-${periodLabel}`,
      "Encontros",
      blankRowStyle
    );
  };

  const handlePdfExport = () => {
    const periodLabel = appliedStartDate && appliedEndDate 
      ? `${formatDateBR(appliedStartDate)} a ${formatDateBR(appliedEndDate)}` 
      : "Todos os períodos";
    
    // Add totals row to exported data
    const dataWithTotals = [
      ...filteredReportData,
      {
        casa_refugio_id: "",
        casa_nome: "TOTAL",
        condominio: "",
        lideres: "",
        data_encontro: "",
        qtd_lideres: totals.qtd_lideres,
        qtd_membros: totals.qtd_membros,
        qtd_criancas: totals.qtd_criancas,
        qtd_visitantes: totals.qtd_visitantes,
        total_presentes: totals.total_presentes,
        ofertas_dinheiro: totals.ofertas_dinheiro,
        ofertas_pix: totals.ofertas_pix,
        ofertas_total: totals.ofertas_total,
        kilos_arrecadados: totals.kilos_arrecadados,
        is_blank: false,
        is_cancelled: false,
        conferido: false,
      },
    ];
    
    const blankRowStyle = (row: any): ExportRowStyle | null => {
      if (row.is_blank) return { fillColor: "#D9D9D9", fontColor: "#666666", italic: true };
      if (row.is_cancelled) return { fillColor: "#E8E8E8", fontColor: "#999999", italic: true };
      return null;
    };

    exportGenericToPDF(
      dataWithTotals,
      filteredExportColumns,
      `relatorio-encontros`,
      `Relatório de Encontros - Casas Refúgio (${periodLabel})`,
      blankRowStyle
    );
  };

  const blankCount = filteredReportData.filter((r) => r.is_blank).length;
  const filledCount = filteredReportData.filter((r) => !r.is_blank).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Relatório Consolidado de Encontros
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4 space-y-4">
          {/* Entity Filters */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Condomínio */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="w-3 h-3" /> Condomínio
                </label>
                <Select value={condominioFilter} onValueChange={setCondominioFilter}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {condominios.map((cond) => (
                      <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supervisor */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Supervisor
                </label>
                <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {supervisores.map((sup) => (
                      <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Casa Refúgio */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Home className="w-3 h-3" /> Casa Refúgio
                </label>
                <Select value={casaRefugioFilter} onValueChange={setCasaRefugioFilter}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {casasFiltradasParaSelect.map((casa) => (
                      <SelectItem key={casa.id} value={casa.id}>{casa.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Status + Column Visibility + Date Range */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Status filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <ListFilter className="w-3 h-3" /> Status
              </label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[160px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="realizadas">Realizadas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Column visibility */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Columns3 className="w-3 h-3" /> Colunas
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[160px] justify-start">
                    <Columns3 className="w-4 h-4 mr-2" />
                    {visibleColumns.size} de {allColumns.length}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <p className="text-sm font-medium mb-2">Colunas visíveis</p>
                  <div className="space-y-2">
                    {allColumns.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isColumnVisible(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Período</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">De:</span>
                <DateInput
                  value={startDate}
                  onChange={(value) => setStartDate(value)}
                  className="w-[160px]"
                  maxDate={undefined}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Até:</span>
                <DateInput
                  value={endDate}
                  onChange={(value) => setEndDate(value)}
                  className="w-[160px]"
                  maxDate={undefined}
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleApplyFilter}>
                Aplicar Período
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearFilter} className="text-destructive">
                Limpar Tudo
              </Button>
            </div>
          </div>
        </div>

        {/* Export Buttons + Stats */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={reportData.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExcelExport}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePdfExport}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span>{filledCount} preenchido{filledCount !== 1 ? "s" : ""}</span>
            <span className="text-amber-500">{blankCount} pendente{blankCount !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReportData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum encontro encontrado para o período selecionado.
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible("casa_nome") && <TableHead className="whitespace-nowrap">Casa Refúgio</TableHead>}
                    {isColumnVisible("condominio") && <TableHead className="whitespace-nowrap">Condomínio</TableHead>}
                    {isColumnVisible("lideres") && <TableHead className="whitespace-nowrap">Líderes da CR</TableHead>}
                    {isColumnVisible("data_encontro") && <TableHead className="whitespace-nowrap">Data</TableHead>}
                    {isColumnVisible("conferido") && <TableHead className="text-center">Conf.</TableHead>}
                    {isColumnVisible("qtd_lideres") && <TableHead className="text-center">Líd.</TableHead>}
                    {isColumnVisible("qtd_membros") && <TableHead className="text-center">Memb.</TableHead>}
                    {isColumnVisible("qtd_criancas") && <TableHead className="text-center">Crian.</TableHead>}
                    {isColumnVisible("qtd_visitantes") && <TableHead className="text-center">Visit.</TableHead>}
                    {isColumnVisible("total_presentes") && <TableHead className="text-center font-semibold">Total</TableHead>}
                    {isColumnVisible("ofertas_dinheiro") && <TableHead className="text-right whitespace-nowrap">R$ Dinh.</TableHead>}
                    {isColumnVisible("ofertas_pix") && <TableHead className="text-right whitespace-nowrap">R$ Pix</TableHead>}
                    {isColumnVisible("ofertas_total") && <TableHead className="text-right whitespace-nowrap font-semibold">R$ Total</TableHead>}
                    {isColumnVisible("kilos_arrecadados") && <TableHead className="text-right">Kilos</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, index) => (
                    <TableRow 
                      key={`${row.casa_refugio_id}-${row.data_encontro}-${index}`}
                      className={row.is_blank ? "bg-destructive/5 text-muted-foreground" : ""}
                    >
                      {isColumnVisible("casa_nome") && (
                        <TableCell className="font-medium whitespace-nowrap">
                          {row.casa_nome}
                          {row.is_blank && (
                            <span className="ml-2 text-xs text-destructive">(pendente)</span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("condominio") && <TableCell className="whitespace-nowrap text-muted-foreground">{row.condominio}</TableCell>}
                      {isColumnVisible("lideres") && <TableCell className="whitespace-nowrap text-muted-foreground">{row.lideres}</TableCell>}
                      {isColumnVisible("data_encontro") && <TableCell className="whitespace-nowrap">{formatDateBR(row.data_encontro)}</TableCell>}
                      {isColumnVisible("conferido") && (
                        <TableCell className="text-center">
                          {row.is_blank ? "-" : (
                            <span className={row.conferido ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                              {row.conferido ? "✓ Sim" : "Não"}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible("qtd_lideres") && <TableCell className="text-center">{row.is_blank ? "-" : row.qtd_lideres}</TableCell>}
                      {isColumnVisible("qtd_membros") && <TableCell className="text-center">{row.is_blank ? "-" : row.qtd_membros}</TableCell>}
                      {isColumnVisible("qtd_criancas") && <TableCell className="text-center">{row.is_blank ? "-" : row.qtd_criancas}</TableCell>}
                      {isColumnVisible("qtd_visitantes") && <TableCell className="text-center">{row.is_blank ? "-" : row.qtd_visitantes}</TableCell>}
                      {isColumnVisible("total_presentes") && <TableCell className="text-center font-semibold">{row.is_blank ? "-" : row.total_presentes}</TableCell>}
                      {isColumnVisible("ofertas_dinheiro") && <TableCell className="text-right">{row.is_blank ? "-" : `R$ ${row.ofertas_dinheiro.toFixed(2)}`}</TableCell>}
                      {isColumnVisible("ofertas_pix") && <TableCell className="text-right">{row.is_blank ? "-" : `R$ ${row.ofertas_pix.toFixed(2)}`}</TableCell>}
                      {isColumnVisible("ofertas_total") && <TableCell className="text-right font-semibold">{row.is_blank ? "-" : `R$ ${row.ofertas_total.toFixed(2)}`}</TableCell>}
                      {isColumnVisible("kilos_arrecadados") && <TableCell className="text-right">{row.is_blank ? "-" : row.kilos_arrecadados.toFixed(1)}</TableCell>}
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    {isColumnVisible("casa_nome") && <TableCell>TOTAL</TableCell>}
                    {isColumnVisible("condominio") && <TableCell />}
                    {isColumnVisible("lideres") && <TableCell />}
                    {isColumnVisible("data_encontro") && <TableCell />}
                    {isColumnVisible("conferido") && <TableCell />}
                    {isColumnVisible("qtd_lideres") && <TableCell className="text-center">{totals.qtd_lideres}</TableCell>}
                    {isColumnVisible("qtd_membros") && <TableCell className="text-center">{totals.qtd_membros}</TableCell>}
                    {isColumnVisible("qtd_criancas") && <TableCell className="text-center">{totals.qtd_criancas}</TableCell>}
                    {isColumnVisible("qtd_visitantes") && <TableCell className="text-center">{totals.qtd_visitantes}</TableCell>}
                    {isColumnVisible("total_presentes") && <TableCell className="text-center">{totals.total_presentes}</TableCell>}
                    {isColumnVisible("ofertas_dinheiro") && <TableCell className="text-right">R$ {totals.ofertas_dinheiro.toFixed(2)}</TableCell>}
                    {isColumnVisible("ofertas_pix") && <TableCell className="text-right">R$ {totals.ofertas_pix.toFixed(2)}</TableCell>}
                    {isColumnVisible("ofertas_total") && <TableCell className="text-right">R$ {totals.ofertas_total.toFixed(2)}</TableCell>}
                    {isColumnVisible("kilos_arrecadados") && <TableCell className="text-right">{totals.kilos_arrecadados.toFixed(1)}</TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
