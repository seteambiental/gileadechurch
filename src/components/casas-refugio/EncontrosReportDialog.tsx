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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileSpreadsheet, FileText, Calendar, Filter, Building, Home, UserCheck } from "lucide-react";
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
import { format, startOfMonth, subMonths } from "date-fns";

interface CasaRefugioData {
  id: string;
  name: string;
  condominio: string | null;
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
}

export const EncontrosReportDialog = ({
  open,
  onOpenChange,
}: EncontrosReportDialogProps) => {
  // Default: last 30 days
  const defaultStartDate = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
  const defaultEndDate = format(new Date(), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [appliedStartDate, setAppliedStartDate] = useState(defaultStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(defaultEndDate);

  // Filters
  const [condominioFilter, setCondominioFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [casaRefugioFilter, setCasaRefugioFilter] = useState("all");

  // Reset dependent filters when parent filter changes
  useEffect(() => {
    setSupervisorFilter("all");
    setCasaRefugioFilter("all");
  }, [condominioFilter]);

  useEffect(() => {
    setCasaRefugioFilter("all");
  }, [supervisorFilter]);

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

  // Map of casa names
  const casasNomesMap = useMemo(() => {
    const map = new Map<string, string>();
    allCasas.forEach((casa) => map.set(casa.id, casa.name));
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
    return encontros.map((encontro) => ({
      casa_refugio_id: encontro.casa_refugio_id,
      casa_nome: casasNomesMap.get(encontro.casa_refugio_id) || "Desconhecida",
      data_encontro: encontro.data_encontro,
      qtd_lideres: encontro.qtd_lideres || 0,
      qtd_membros: encontro.qtd_membros || 0,
      qtd_criancas: encontro.qtd_criancas || 0,
      qtd_visitantes: encontro.qtd_visitantes || 0,
      total_presentes:
        (encontro.qtd_lideres || 0) +
        (encontro.qtd_membros || 0) +
        (encontro.qtd_criancas || 0) +
        (encontro.qtd_visitantes || 0),
      ofertas_dinheiro: Number(encontro.ofertas_dinheiro || 0),
      ofertas_pix: Number(encontro.ofertas_pix || 0),
      ofertas_total: Number(encontro.ofertas || 0),
      kilos_arrecadados: Number(encontro.kilos_arrecadados || 0),
    }));
  }, [encontros, casasNomesMap]);

  // Totals
  const totals = useMemo(() => {
    return reportData.reduce(
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
  }, [reportData]);

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
  };

  const exportColumns: ExportColumn[] = [
    { header: "Casa Refúgio", accessor: "casa_nome" },
    { 
      header: "Data do Encontro", 
      accessor: "data_encontro",
      format: (value) => formatDateBR(value),
    },
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
      reportData,
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
      reportData,
      exportColumns,
      `relatorio-encontros`,
      `Relatório de Encontros - Casas Refúgio (${periodLabel})`
    );
  };

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

        {/* Export Buttons */}
        <div className="flex items-center gap-2 mb-4">
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
          <span className="text-sm text-muted-foreground ml-auto">
            {reportData.length} encontro{reportData.length !== 1 ? "s" : ""} encontrado{reportData.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum encontro encontrado para o período selecionado.
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Casa Refúgio</TableHead>
                  <TableHead className="whitespace-nowrap">Data</TableHead>
                  <TableHead className="text-center">Líd.</TableHead>
                  <TableHead className="text-center">Memb.</TableHead>
                  <TableHead className="text-center">Crian.</TableHead>
                  <TableHead className="text-center">Visit.</TableHead>
                  <TableHead className="text-center font-semibold">Total</TableHead>
                  <TableHead className="text-right whitespace-nowrap">R$ Dinh.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">R$ Pix</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold">R$ Total</TableHead>
                  <TableHead className="text-right">Kilos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium whitespace-nowrap">{row.casa_nome}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateBR(row.data_encontro)}</TableCell>
                    <TableCell className="text-center">{row.qtd_lideres}</TableCell>
                    <TableCell className="text-center">{row.qtd_membros}</TableCell>
                    <TableCell className="text-center">{row.qtd_criancas}</TableCell>
                    <TableCell className="text-center">{row.qtd_visitantes}</TableCell>
                    <TableCell className="text-center font-semibold">{row.total_presentes}</TableCell>
                    <TableCell className="text-right">R$ {row.ofertas_dinheiro.toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {row.ofertas_pix.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">R$ {row.ofertas_total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.kilos_arrecadados.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-center">{totals.qtd_lideres}</TableCell>
                  <TableCell className="text-center">{totals.qtd_membros}</TableCell>
                  <TableCell className="text-center">{totals.qtd_criancas}</TableCell>
                  <TableCell className="text-center">{totals.qtd_visitantes}</TableCell>
                  <TableCell className="text-center">{totals.total_presentes}</TableCell>
                  <TableCell className="text-right">R$ {totals.ofertas_dinheiro.toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {totals.ofertas_pix.toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {totals.ofertas_total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totals.kilos_arrecadados.toFixed(1)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
