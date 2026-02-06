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
import { Loader2, FileSpreadsheet, FileText, Calendar, Filter, Building, Home, UserCheck, ChevronLeft, ChevronRight, Columns3, ListFilter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateBR } from "@/lib/masks";
import { exportGenericToExcel, exportGenericToPDF, ExportColumn } from "@/lib/export";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, parseISO } from "date-fns";

interface CasaRefugioData {
  id: string;
  name: string;
  condominio: string | null;
  dias: string | null;
  frequencia: string | null;
  data_inicio_cr: string | null;
  supervisor?: { full_name: string } | null;
}

interface EncontrosReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EncontroReport {
  casa_refugio_id: string;
  casa_nome: string;
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
  dayOfWeek: number
): string[] => {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (start > end) return [];

  const allDays = eachDayOfInterval({ start, end });
  return allDays
    .filter((d) => getDay(d) === dayOfWeek)
    .map((d) => format(d, "yyyy-MM-dd"));
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
    { key: "data_encontro", label: "Data", default: true },
    { key: "qtd_lideres", label: "Líderes", default: true },
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
          supervisor:members!casas_refugio_supervisor_id_fkey(full_name)
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
    // Build a set of existing encontros by casa_id + date
    const existingSet = new Set<string>();
    const existingMap = new Map<string, typeof encontros[0]>();
    encontros.forEach((e) => {
      const key = `${e.casa_refugio_id}_${e.data_encontro}`;
      existingSet.add(key);
      existingMap.set(key, e);
    });

    const rows: EncontroReport[] = [];

    // For each filtered casa, generate expected dates and merge with existing
    const casasToProcess = casaRefugioFilter !== "all"
      ? allCasas.filter((c) => c.id === casaRefugioFilter)
      : casasFiltradasParaSelect;

    casasToProcess.forEach((casa) => {
      const dayNumber = casa.dias ? dayNameToNumber[casa.dias] : null;
      if (dayNumber === null || dayNumber === undefined) return;

      // Use data_inicio_cr as start, but clamp to appliedStartDate
      const casaStart = casa.data_inicio_cr && casa.data_inicio_cr > appliedStartDate 
        ? casa.data_inicio_cr 
        : appliedStartDate;
      const expectedDates = generateExpectedDates(casaStart, appliedEndDate, dayNumber);

      expectedDates.forEach((date) => {
        const key = `${casa.id}_${date}`;
        const existing = existingMap.get(key);

        if (existing) {
          rows.push({
            casa_refugio_id: casa.id,
            casa_nome: casa.name,
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
          });
        } else {
          rows.push({
            casa_refugio_id: casa.id,
            casa_nome: casa.name,
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
          });
        }
      });
    });

    // Also add encontros that exist but don't match expected days
    encontros.forEach((e) => {
      const casa = casasMap.get(e.casa_refugio_id);
      if (!casa) return;
      const dayNumber = casa.dias ? dayNameToNumber[casa.dias] : null;
      const eDate = parseISO(e.data_encontro);
      if (dayNumber === null || getDay(eDate) !== dayNumber) {
        // This encontro was on an unexpected day, still include it
        const key = `${e.casa_refugio_id}_${e.data_encontro}`;
        if (!existingSet.has(key)) return; // should always be true
        const alreadyAdded = rows.some(
          (r) => r.casa_refugio_id === e.casa_refugio_id && r.data_encontro === e.data_encontro
        );
        if (!alreadyAdded) {
          rows.push({
            casa_refugio_id: e.casa_refugio_id,
            casa_nome: casa.name,
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
          });
        }
      }
    });

    // Sort by date then casa name
    rows.sort((a, b) => {
      const dateCompare = a.data_encontro.localeCompare(b.data_encontro);
      if (dateCompare !== 0) return dateCompare;
      return a.casa_nome.localeCompare(b.casa_nome);
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
      .filter((r) => !r.is_blank)
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
    { 
      header: "Data do Encontro", 
      accessor: "data_encontro",
      format: (value) => formatDateBR(value),
    },
    { header: "Status", accessor: (row) => row.is_blank ? "Pendente" : "Preenchido" },
    { header: "Líderes", accessor: "qtd_lideres" },
    { header: "Membros", accessor: "qtd_membros" },
    { header: "Crianças", accessor: "qtd_criancas" },
    { header: "Visitantes", accessor: "qtd_visitantes" },
    { header: "Total Presentes", accessor: "total_presentes" },
    { 
      header: "Ofertas Dinheiro", 
      accessor: "ofertas_dinheiro",
      format: (value) => `R$ ${Number(value).toFixed(2)}`,
    },
    { 
      header: "Ofertas PIX", 
      accessor: "ofertas_pix",
      format: (value) => `R$ ${Number(value).toFixed(2)}`,
    },
    { 
      header: "Ofertas Total", 
      accessor: "ofertas_total",
      format: (value) => `R$ ${Number(value).toFixed(2)}`,
    },
    { 
      header: "Kilos Arrecadados", 
      accessor: "kilos_arrecadados",
      format: (value) => `${Number(value).toFixed(1)} kg`,
    },
  ];

  const handleExcelExport = () => {
    const periodLabel = appliedStartDate && appliedEndDate 
      ? `${formatDateBR(appliedStartDate)}-${formatDateBR(appliedEndDate)}` 
      : "todos";
    exportGenericToExcel(
      filteredReportData,
      exportColumns,
      `relatorio-encontros-${periodLabel}`,
      "Encontros"
    );
  };

  const handlePdfExport = () => {
    const periodLabel = appliedStartDate && appliedEndDate 
      ? `${formatDateBR(appliedStartDate)} a ${formatDateBR(appliedEndDate)}` 
      : "Todos os períodos";
    exportGenericToPDF(
      filteredReportData,
      exportColumns,
      `relatorio-encontros`,
      `Relatório de Encontros - Casas Refúgio (${periodLabel})`
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcelExport}
            disabled={reportData.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePdfExport}
            disabled={reportData.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
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
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isColumnVisible("casa_nome") && <TableHead className="whitespace-nowrap">Casa Refúgio</TableHead>}
                    {isColumnVisible("data_encontro") && <TableHead className="whitespace-nowrap">Data</TableHead>}
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
                      {isColumnVisible("data_encontro") && <TableCell className="whitespace-nowrap">{formatDateBR(row.data_encontro)}</TableCell>}
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
                    {isColumnVisible("data_encontro") && <TableCell />}
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
