import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { formatCurrency, formatDateBR } from "@/lib/masks";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Check, Clock, TrendingUp, Users, ArrowDownCircle, Scale, Download, FileSpreadsheet, FileText, Columns3, CalendarClock, Filter, Archive, ClipboardList, ShieldAlert, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { DateInput } from "@/components/ui/date-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImpactoDespesasTab from "./ImpactoDespesasTab";
import FinalizarEventoDialog from "./FinalizarEventoDialog";
import EnvioEmergenciaDialog from "./EnvioEmergenciaDialog";
import { exportGenericToExcel, exportGenericToPDF, savePDF } from "@/lib/export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";



const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
  ministrador: "Ministrador",
};

const ImpactoFinanceiroTab = ({ eventoSelecionado, onEventoChange }: { eventoSelecionado?: string; onEventoChange?: (id: string) => void }) => {
  const navigate = useNavigate();
  const [selectedEventoId, setSelectedEventoIdLocal] = useState(eventoSelecionado || "");
  const setSelectedEventoId = (id: string) => {
    setSelectedEventoIdLocal(id);
    onEventoChange?.(id);
  };
  const [searchNome, setSearchNome] = useState("");
  const [filtroGenero, setFiltroGenero] = useState("todos");
  const [dataPrevisaoInput, setDataPrevisaoInput] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [emergenciaOpen, setEmergenciaOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortRefDir, setSortRefDir] = useState<"asc" | "desc" | null>(null);
  const toggleSortRef = () => {
    setSortRefDir((prev) => (prev === null ? "asc" : prev === "asc" ? "desc" : null));
  };

  const handleAplicarPrevisao = useCallback(() => {
    setDataPrevisao(dataPrevisaoInput);
  }, [dataPrevisaoInput]);

  useEffect(() => {
    if (eventoSelecionado) setSelectedEventoIdLocal(eventoSelecionado);
  }, [eventoSelecionado]);

  const allColumns = [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "genero", label: "Gênero" },
    { key: "referencia", label: "Referência" },
    { key: "casa_refugio", label: "Casa Refúgio" },
    { key: "condominio", label: "Condomínio" },
    { key: "funcao", label: "Função" },
    { key: "valor_inscricao", label: "Valor Inscrição" },
    { key: "valor_pago", label: "Valor Pago" },
    { key: "saldo", label: "Saldo" },
    { key: "previsoes", label: "Previsões Pgto" },
    { key: "forma_pagamento", label: "Forma Pgto" },
    { key: "status", label: "Status" },
  ] as const;

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(allColumns.map((c) => c.key))
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: string) => visibleColumns.has(key);

  const { data: impactoEventos } = useQuery({
    queryKey: ["impacto-eventos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, data_fim, tipo, valor_inscricao, valores_por_tipo, tipos_inscricao, tem_custo, finalizado")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: agendaEventos } = useQuery({
    queryKey: ["agenda-eventos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim")
        .eq("necessita_inscricao", true)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isTeologiaEvent = (titulo: string | null) => {
    if (!titulo) return false;
    const norm = titulo.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return norm.includes("teologia") || norm.includes("curso de teologia");
  };

  const isCasaisEvent = (titulo: string | null) => {
    if (!titulo) return false;
    const norm = titulo.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return norm.includes("casais") || norm.includes("curso de casais");
  };

  const isJiuJitsuEvent = (titulo: string | null) => {
    if (!titulo) return false;
    const norm = titulo.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return norm.includes("jiu") || norm.includes("jitsu") || norm.includes("jiu-jitsu") || norm.includes("jiujitsu");
  };

  const isExcludedModule = (titulo: string | null) =>
    isTeologiaEvent(titulo) || isCasaisEvent(titulo) || isJiuJitsuEvent(titulo);

  const eventos = useMemo(() => {
    // Track ALL finalized event IDs and titles to exclude from both sources
    const finalizadoIds = new Set<string>();
    const finalizadoTitles = new Set<string>();
    (impactoEventos || []).forEach((e) => {
      if ((e as any).finalizado) {
        finalizadoIds.add(e.id);
        if (e.titulo) finalizadoTitles.add(e.titulo.trim().toLowerCase());
      }
    });

    // Deduplicar impacto_eventos por título normalizado e excluir finalizados
    const seenTitles = new Set<string>();
    const impactoDeduped = (impactoEventos || []).filter((e) => {
      if (isExcludedModule(e.titulo)) return false;
      if ((e as any).finalizado) return false;
      const key = e.titulo?.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    const impacto = impactoDeduped.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_inicio,
    }));
    const agenda = (agendaEventos || [])
      .filter((e) => !isExcludedModule(e.titulo))
      .filter((e) => !finalizadoIds.has(e.id) && !finalizadoTitles.has(e.titulo?.trim().toLowerCase() || ""))
      .map((e) => ({
        id: e.id,
        titulo: e.titulo,
        data_inicio: e.data_evento,
      }));
    // Deduplicate by ID first, then by normalized title (impacto takes priority)
    const impactoIds = new Set(impacto.map((e) => e.id));
    const impactoTitlesNorm = new Set(impacto.map((e) => e.titulo?.trim().toLowerCase()));
    const uniqueAgenda = agenda.filter((e) => !impactoIds.has(e.id) && !impactoTitlesNorm.has(e.titulo?.trim().toLowerCase()));
    return [...impacto, ...uniqueAgenda].sort((a, b) =>
      new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
    );
  }, [impactoEventos, agendaEventos]);

  const { data: rawImpactoInscricoes, isLoading } = useQuery({
    queryKey: ["impacto-inscricoes-financeiro", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("id, member_id, nome, genero, tipo_inscricao, valor_inscricao, valor_pago, status_pagamento, forma_pagamento, pagamentos, created_at, referencia, previsoes_pagamento, aprovado")
        .eq("evento_id", selectedEventoId)
        .eq("aprovado", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventoId,
  });

  // Fetch member details for Casa Refúgio, Condomínio, and Função
  const memberIds = useMemo(() => {
    return (rawImpactoInscricoes || []).map((i) => i.member_id).filter(Boolean) as string[];
  }, [rawImpactoInscricoes]);

  const { data: memberDetails } = useQuery({
    queryKey: ["financeiro-member-details", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, casa_refugio_id, casas_refugio:casa_refugio_id(name, condominio), member_functions(function_type, ministries:ministry_id(name), casas_refugio:casa_refugio_id(name), condominios:condominio_id(name))")
        .in("id", memberIds);
      if (error) throw error;
      return data || [];
    },
    enabled: memberIds.length > 0,
  });

  const memberMap = useMemo(() => {
    const map = new Map<string, any>();
    (memberDetails || []).forEach((m: any) => map.set(m.id, m));
    return map;
  }, [memberDetails]);

  const { data: condominios } = useQuery({
    queryKey: ["condominios-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("condominios").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const condominioMap = useMemo(() => {
    const map = new Map<string, string>();
    (condominios || []).forEach((c: any) => map.set(c.id, c.name));
    return map;
  }, [condominios]);

  const getMemberCasaRefugio = (memberId: string | null): string => {
    if (!memberId) return "—";
    const m = memberMap.get(memberId);
    if (!m) return "—";
    const cr = m.casas_refugio as any;
    return cr?.name || "—";
  };

  const getMemberCondominio = (memberId: string | null): string => {
    if (!memberId) return "—";
    const m = memberMap.get(memberId);
    if (!m) return "—";
    const cr = m.casas_refugio as any;
    if (cr?.condominio) return condominioMap.get(cr.condominio) || cr.condominio;
    return "—";
  };

  const getFuncaoLabel = (fn: any): string => {
    const type = fn.function_type;
    const entityName = fn.ministries?.name || fn.casas_refugio?.name || fn.condominios?.name || "";
    
    switch (type) {
      case "lider_ministerio":
        return entityName ? `Líder de ${entityName}` : "Líder de Ministério";
      case "integrante_ministerio":
        return entityName ? `Equipe de ${entityName}` : "Integrante de Ministério";
      case "lider_casa_refugio":
        return entityName ? `Líder de ${entityName}` : "Líder de Casa Refúgio";
      case "anfitriao_casa_refugio":
        return entityName ? `Anfitrião(ã) de ${entityName}` : "Anfitrião(ã) de Casa Refúgio";
      case "supervisor_casa_refugio":
        return entityName ? `Supervisor de ${entityName}` : "Supervisor";
      case "sindico_condominio":
        return entityName ? `Síndico de ${entityName}` : "Síndico";
      case "pastor_geral":
        return "Pastor Geral";
      case "pastor_auxiliar":
        return "Pastor Auxiliar";
      default:
        return entityName ? `${type} - ${entityName}` : type;
    }
  };

  const getMemberFuncoes = (memberId: string | null): string => {
    if (!memberId) return "—";
    const m = memberMap.get(memberId);
    if (!m || !m.member_functions || m.member_functions.length === 0) return "—";
    return m.member_functions.map((fn: any) => getFuncaoLabel(fn)).join("; ");
  };

  const inscricoes = useMemo(() => {
    const imp = rawImpactoInscricoes || [];
    const arr = [...imp];
    if (sortRefDir) {
      const parseRef = (r: any) => {
        const n = parseInt(String(r ?? "").replace(/\D/g, ""), 10);
        return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
      };
      arr.sort((a: any, b: any) => {
        const diff = parseRef(a.referencia) - parseRef(b.referencia);
        return sortRefDir === "asc" ? diff : -diff;
      });
    } else {
      arr.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
    }
    return arr;
  }, [rawImpactoInscricoes, sortRefDir]);

  // Column filter state: key -> Set of selected values
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  const { data: despesas = [] } = useQuery({
    queryKey: ["impacto-despesas", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_despesas")
        .select("valor")
        .eq("evento_id", selectedEventoId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventoId,
  });

  const selectedEvento = eventos?.find((e) => e.id === selectedEventoId);

  const resolveGenero = (g: string | null | undefined): string => {
    if (!g) return "";
    const lower = g.toLowerCase();
    if (lower === "m" || lower === "masculino") return "M";
    if (lower === "f" || lower === "feminino") return "F";
    return "";
  };

  const inscricoesPreFiltradas = useMemo(() => {
    if (!inscricoes) return [];
    let resultado = inscricoes;
    if (filtroGenero !== "todos") {
      resultado = resultado.filter((i) => resolveGenero((i as any).genero) === filtroGenero);
    }
    if (searchNome.trim()) {
      const q = searchNome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      resultado = resultado.filter((i) =>
        i.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
      );
    }
    return resultado;
  }, [inscricoes, searchNome, filtroGenero]);

  const totalInscritos = inscricoes?.length || 0;

  // Normalize payment status across legacy/new values
  const normalizeStatus = (status: string | null | undefined): "pago" | "parcial" | "pendente" => {
    const s = String(status || "").toLowerCase().trim();
    if (["pago", "confirmado", "aprovado", "quitado", "pago_total"].includes(s)) return "pago";
    if (["parcial", "parcialmente_pago", "parcialmente pago", "pago_parcial"].includes(s)) return "parcial";
    if (["pendente", "a pagar", "aguardando", "em_aberto", "aberto"].includes(s)) return "pendente";
    return "pendente";
  };

  // Calculate real totals from inscription data
  const totalPrevisao = inscricoes?.reduce((sum, i) => sum + (i.valor_inscricao || 0), 0) || 0;
  const totalPago = inscricoes?.reduce((sum, i) => sum + (i.valor_pago || 0), 0) || 0;
  const totalAReceber = inscricoes?.reduce((sum, i) => {
    const norm = normalizeStatus(i.status_pagamento);
    if (norm === "pendente") return sum + (i.valor_inscricao || 0);
    if (norm === "parcial") return sum + Math.max(0, (i.valor_inscricao || 0) - (i.valor_pago || 0));
    return sum;
  }, 0) || 0;
  const totalDespesas = (despesas as any[]).reduce((sum, d) => sum + (d.valor || 0), 0);
  const saldoEvento = totalPago - totalDespesas;

  // Calculate forecast total up to selected date
  const totalPrevisaoPorData = useMemo(() => {
    if (!dataPrevisao || !inscricoes) return 0;
    return inscricoes.reduce((sum, i) => {
      const previsoes = i.previsoes_pagamento as Array<{ data: string; valor: number }> | null;
      if (!previsoes || !Array.isArray(previsoes)) return sum;
      return sum + previsoes
        .filter((p) => p.data && p.data <= dataPrevisao)
        .reduce((s, p) => s + (parseFloat(String(p.valor)) || 0), 0);
    }, 0);
  }, [inscricoes, dataPrevisao]);

  // Count by status
  const pagos = inscricoes?.filter((i) => normalizeStatus(i.status_pagamento) === "pago").length || 0;
  const parciais = inscricoes?.filter((i) => normalizeStatus(i.status_pagamento) === "parcial").length || 0;
  const pendentes = inscricoes?.filter((i) => normalizeStatus(i.status_pagamento) === "pendente").length || 0;

  // Calculate totals by payment method
  const totalByPaymentMethod = inscricoes?.reduce((acc, i) => {
    const pagamentosArr = i.pagamentos as Array<{ tipo: string; valor: string | number }> | null;
    if (pagamentosArr && Array.isArray(pagamentosArr) && pagamentosArr.length > 0) {
      pagamentosArr.forEach((p) => {
        if (p.tipo && parseFloat(String(p.valor)) > 0) {
          acc[p.tipo] = (acc[p.tipo] || 0) + parseFloat(String(p.valor));
        }
      });
    } else if (i.forma_pagamento && (i.valor_pago || 0) > 0) {
      acc[i.forma_pagamento] = (acc[i.forma_pagamento] || 0) + (i.valor_pago || 0);
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
    pix: "PIX",
    dinheiro: "Dinheiro",
    credito: "Cartão Crédito",
    debito: "Cartão Débito",
    cartao_credito: "Cartão Crédito",
    cartao_debito: "Cartão Débito",
    transferencia: "Transferência",
    boleto: "Boleto",
    vale: "Vale",
  };

  // Count by type
  const countByType = inscricoes?.reduce((acc, i) => {
    const tipo = i.tipo_inscricao || "membro";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Quebra por categoria (Equipe x Participantes) e status de pagamento
  const resumoCategorias = useMemo(() => {
    const isEquipe = (i: any) => ["equipe", "ministrador"].includes(i.tipo_inscricao || "");
    const acc = {
      equipePagaQtd: 0,
      equipePagaValor: 0,
      equipeNaoPagaQtd: 0,
      equipeNaoPagaValor: 0,
      participantePagaQtd: 0,
      participantePagaValor: 0,
      participanteNaoPagaQtd: 0,
      participanteNaoPagaValor: 0,
    };
    (inscricoes || []).forEach((i: any) => {
      const pago = normalizeStatus(i.status_pagamento) === "pago";
      const equipe = isEquipe(i);
      const valorPago = i.valor_pago || 0;
      const saldo = Math.max(0, (i.valor_inscricao || 0) - (i.valor_pago || 0));
      if (equipe) {
        if (pago) {
          acc.equipePagaQtd += 1;
          acc.equipePagaValor += valorPago;
        } else {
          acc.equipeNaoPagaQtd += 1;
          acc.equipeNaoPagaValor += saldo;
        }
      } else {
        if (pago) {
          acc.participantePagaQtd += 1;
          acc.participantePagaValor += valorPago;
        } else {
          acc.participanteNaoPagaQtd += 1;
          acc.participanteNaoPagaValor += saldo;
        }
      }
    });
    return acc;
  }, [inscricoes]);

  const formatFormaPagamentoComValor = (row: any) => {
    const pagamentosArr = row.pagamentos as Array<{ tipo: string; valor: string | number }> | null;

    if (pagamentosArr && Array.isArray(pagamentosArr) && pagamentosArr.length > 0) {
      const partes = pagamentosArr
        .filter((p) => p.tipo && parseFloat(String(p.valor)) > 0)
        .map((p) => `${FORMAS_PAGAMENTO_LABELS[p.tipo] || p.tipo}: ${formatCurrency(parseFloat(String(p.valor)) || 0)}`);

      if (partes.length > 0) return partes.join("; ");
    }

    if (row.forma_pagamento && (row.valor_pago || 0) > 0) {
      return `${FORMAS_PAGAMENTO_LABELS[row.forma_pagamento] || row.forma_pagamento}: ${formatCurrency(row.valor_pago || 0)}`;
    }

    return row.forma_pagamento ? (FORMAS_PAGAMENTO_LABELS[row.forma_pagamento] || row.forma_pagamento) : "—";
  };

  const getStatusLabel = (status: string | null | undefined) => {
    const normalized = normalizeStatus(status);
    if (normalized === "pago") return "Pago";
    if (normalized === "parcial") return "Parcial";
    return "Pendente";
  };

  // Helper to get display value per column for a row
  const getColumnValue = useCallback((row: any, colKey: string): string => {
    switch (colKey) {
      case "nome": return row.nome || "—";
      case "tipo": return TIPOS_INSCRICAO_LABELS[row.tipo_inscricao || ""] || row.tipo_inscricao || "—";
      case "genero": {
        const g = (row.genero || "").toLowerCase();
        if (g === "m" || g === "masculino") return "Masculino";
        if (g === "f" || g === "feminino") return "Feminino";
        return "—";
      }
      case "referencia": return row.referencia || "—";
      case "casa_refugio": return getMemberCasaRefugio(row.member_id);
      case "condominio": return getMemberCondominio(row.member_id);
      case "funcao": return getMemberFuncoes(row.member_id);
      case "status": return getStatusLabel(row.status_pagamento);
      case "forma_pagamento": return formatFormaPagamentoComValor(row);
      default: return "—";
    }
  }, [memberMap, condominioMap]);

  // Filterable columns (exclude numeric/preview columns)
  const filterableColumns = ["tipo", "genero", "referencia", "casa_refugio", "condominio", "funcao", "status", "forma_pagamento"];

  // Compute unique values for each filterable column
  const columnUniqueValues = useMemo(() => {
    const result: Record<string, string[]> = {};
    filterableColumns.forEach((key) => {
      const vals = new Set<string>();
      (inscricoes || []).forEach((row) => vals.add(getColumnValue(row, key)));
      result[key] = Array.from(vals).sort((a, b) => a.localeCompare(b, "pt-BR"));
    });
    return result;
  }, [inscricoes, getColumnValue]);

  const setColumnFilter = useCallback((colKey: string, selected: Set<string>) => {
    setColumnFilters((prev) => ({ ...prev, [colKey]: selected }));
  }, []);

  // Final filtered list with column filters applied
  const inscricoesFiltradas = useMemo(() => {
    let resultado = [...inscricoesPreFiltradas];
    filterableColumns.forEach((colKey) => {
      const filter = columnFilters[colKey];
      if (filter && filter.size > 0 && filter.size < (columnUniqueValues[colKey]?.length || 0)) {
        resultado = resultado.filter((row) => filter.has(getColumnValue(row, colKey)));
      }
    });
    return resultado;
  }, [inscricoesPreFiltradas, columnFilters, columnUniqueValues, getColumnValue]);

  // Mantém apenas os ids selecionados que continuam visíveis na lista filtrada
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => inscricoesFiltradas.some((i) => i.id === id)));
  }, [inscricoesFiltradas]);

  const toggleSelectId = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? inscricoesFiltradas.map((i) => i.id) : []);
  };

  const getStatusBadge = (status: string | null) => {
    const normalized = normalizeStatus(status);
    if (normalized === "pago") {
      return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Pago</Badge>;
    }
    if (normalized === "parcial") {
      return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Parcial</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  };

  const eventoNomeFinanceiro = eventos?.find((e) => e.id === selectedEventoId)?.titulo || "financeiro";

  const formatPrevisoes = (previsoes: any) => {
    if (!previsoes || !Array.isArray(previsoes) || previsoes.length === 0) return "—";
    return previsoes.map((p: any) => `${formatDateBR(p.data)}: ${formatCurrency(parseFloat(String(p.valor)) || 0)}`).join("; ");
  };

  const getExportColumnsReceitas = (): import("@/lib/export").ExportColumn[] => {
    const all: Record<string, import("@/lib/export").ExportColumn> = {
      nome: { header: "Nome", accessor: (row: any) => row.nome },
      tipo: { header: "Tipo", accessor: (row: any) => TIPOS_INSCRICAO_LABELS[row.tipo_inscricao || ""] || row.tipo_inscricao || "—" },
      genero: { header: "Gênero", accessor: (row: any) => {
        const g = row.genero;
        if (!g) return "—";
        return { M: "Masculino", F: "Feminino", masculino: "Masculino", feminino: "Feminino" }[g] || g;
      }},
      referencia: { header: "Referência", accessor: (row: any) => row.referencia || "—" },
      casa_refugio: { header: "Casa Refúgio", accessor: (row: any) => getMemberCasaRefugio(row.member_id) },
      condominio: { header: "Condomínio", accessor: (row: any) => getMemberCondominio(row.member_id) },
      funcao: { header: "Função", accessor: (row: any) => getMemberFuncoes(row.member_id) },
      valor_inscricao: { header: "Valor Inscrição", accessor: (row: any) => row.valor_inscricao || 0, format: (value: any) => formatCurrency(Number(value) || 0), type: 'currency' as const },
      valor_pago: { header: "Valor Pago", accessor: (row: any) => row.valor_pago || 0, format: (value: any) => formatCurrency(Number(value) || 0), type: 'currency' as const },
      saldo: { header: "Saldo", accessor: (row: any) => Math.max(0, (row.valor_inscricao || 0) - (row.valor_pago || 0)), format: (value: any) => formatCurrency(Number(value) || 0), type: 'currency' as const },
      previsoes: { header: "Previsões Pgto", accessor: (row: any) => formatPrevisoes(row.previsoes_pagamento) },
      forma_pagamento: { header: "Forma Pagamento", accessor: (row: any) => formatFormaPagamentoComValor(row) },
      status: { header: "Status", accessor: (row: any) => getStatusLabel(row.status_pagamento) },
    };
    return allColumns.filter((c) => visibleColumns.has(c.key)).map((c) => all[c.key]).filter(Boolean);
  };

  const pendingRowStyle = (row: any) => {
    const normalized = normalizeStatus(row.status_pagamento);
    const statusLabel = getStatusLabel(row.status_pagamento).toLowerCase();
    if (normalized === "pendente" || statusLabel === "pendente") {
      return { fillColor: "#FFF3CD", fontColor: "#856404" };
    }
    return null;
  };

  const handleExportReceitasExcel = async () => {
    if (!inscricoesFiltradas.length) return;
    await exportGenericToExcel(inscricoesFiltradas, getExportColumnsReceitas(), `Financeiro_${eventoNomeFinanceiro}`, "Receitas", pendingRowStyle);
  };

  const handleExportReceitasPDF = () => {
    if (!inscricoesFiltradas.length) return;

    const doc = new jsPDF({ orientation: "landscape" });

    // Title
    doc.setFontSize(16);
    doc.text(`Financeiro — Receitas — ${eventoNomeFinanceiro}`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 25);

    // Summary cards matching what's on screen
    let yPos = 32;
    doc.setFontSize(9);
    doc.setTextColor(60);

    const summaryItems = [
      `Inscrições: ${totalInscritos}`,
      `Previsão de Valores: ${formatCurrency(totalPrevisao)}`,
      `Valor Já Pago: ${formatCurrency(totalPago)}`,
      `Valor a Receber: ${formatCurrency(totalAReceber)}`,
      `Total de Despesas: ${formatCurrency(totalDespesas)}`,
      `Saldo do Evento: ${formatCurrency(saldoEvento)}`,
    ];
    const statusSummary = `${pagos} pagos, ${parciais} parciais, ${pendentes} pendentes`;
    summaryItems.push(`Status: ${statusSummary}`);

    if (Object.keys(totalByPaymentMethod).length > 0) {
      const methodParts = Object.entries(totalByPaymentMethod)
        .sort(([, a], [, b]) => b - a)
        .map(([method, value]) => `${FORMAS_PAGAMENTO_LABELS[method] || method}: ${formatCurrency(value)}`);
      summaryItems.push(`Formas de Pgto: ${methodParts.join(" | ")}`);
    }

    // Render summary in 2 columns
    const colWidth = 130;
    const half = Math.ceil(summaryItems.length / 2);
    summaryItems.forEach((item, idx) => {
      const col = idx < half ? 0 : 1;
      const row = idx < half ? idx : idx - half;
      doc.text(item, 14 + col * colWidth, yPos + row * 5);
    });

    yPos += Math.ceil(summaryItems.length / 2) * 5 + 4;

    // Build table data using same columns as screen
    const exportCols = getExportColumnsReceitas();
    const tableHeaders = exportCols.map((c) => c.header);
    const tableData = inscricoesFiltradas.map((row) =>
      exportCols.map((col) => {
        const value = typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor as string];
        if (col.type === 'currency') return formatCurrency(Number(value) || 0);
        if (col.format) return col.format(value);
        return value ?? "—";
      })
    );

    // Total row
    const totalsRow = exportCols.map((col) => {
      if (!col.type) return "";
      const sum = inscricoesFiltradas.reduce((s, row) => {
        const value = typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor as string];
        return s + (Number(value) || 0);
      }, 0);
      return formatCurrency(sum);
    });
    if (totalsRow[0] === "") totalsRow[0] = "TOTAL";
    tableData.push(totalsRow);

    autoTable(doc, {
      head: [tableHeaders],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [220, 53, 69],
        textColor: 255,
        fontStyle: "bold",
      },
      didParseCell: (hookData: any) => {
        if (hookData.section !== "body") return;
        const rowIdx = hookData.row.index;

        // Total row styling
        if (rowIdx === tableData.length - 1) {
          hookData.cell.styles.fillColor = [230, 230, 230];
          hookData.cell.styles.fontStyle = "bold";
          return;
        }

        // Pending row styling (matching screen's yellow highlight)
        const originalRow = inscricoes[rowIdx];
        if (originalRow) {
          const normalized = normalizeStatus(originalRow.status_pagamento);
          if (normalized === "pendente") {
            hookData.cell.styles.fillColor = [255, 243, 205];
            hookData.cell.styles.textColor = [133, 100, 4];
          } else if (rowIdx % 2 === 1) {
            hookData.cell.styles.fillColor = [248, 249, 250];
          }
        }
      },
    });

    savePDF(doc, `Financeiro_${eventoNomeFinanceiro}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Financeiro</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedEventoId} onValueChange={setSelectedEventoId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {eventos?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {format(parseLocalDate(e.data_inicio), "dd/MM", { locale: ptBR })} — {e.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventoId && inscricoes.length > 0 && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="w-4 h-4 mr-2" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3" align="end">
                  <p className="text-sm font-medium mb-2">Colunas visíveis</p>
                  <div className="space-y-2">
                    {allColumns.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isCol(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportReceitasExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportReceitasPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {selectedEventoId && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/ministerio/impacto?tab=inscricoes-impacto&evento=${selectedEventoId}`)}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Inscrições
            </Button>
          )}
          {selectedEventoId && inscricoes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setEmergenciaOpen(true)}>
              <ShieldAlert className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          )}
          {selectedEventoId && inscricoes.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setFinalizarOpen(true)}>
              <Archive className="w-4 h-4 mr-2" />
              Finalizar Evento
            </Button>
          )}
        </div>
      </div>

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver o financeiro.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Inscrições</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInscritos}</div>
                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {Object.entries(countByType).map(([tipo, count]) => (
                    <div key={tipo}>{TIPOS_INSCRICAO_LABELS[tipo] || tipo}: {count}</div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Previsão de Valores</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPrevisao)}</div>
                <p className="text-xs text-muted-foreground">
                  Soma dos valores de inscrição
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor Já Pago</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {Object.keys(totalByPaymentMethod).length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                    {Object.entries(totalByPaymentMethod)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, value]) => (
                        <div key={method} className="flex justify-between">
                          <span>{FORMAS_PAGAMENTO_LABELS[method] || method}</span>
                          <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                        </div>
                      ))}
                    <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-foreground">
                      <span>Total</span>
                      <span className="text-green-600">{formatCurrency(totalPago)}</span>
                    </div>
                  </div>
                )}
                {Object.keys(totalByPaymentMethod).length === 0 && (
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {pagos} pagos{parciais > 0 ? `, ${parciais} parciais` : ""}{pendentes > 0 ? `, ${pendentes} pendentes` : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor a Receber</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalAReceber)}</div>
                <p className="text-xs text-muted-foreground">
                  {pendentes} pendentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
                <ArrowDownCircle className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDespesas)}</div>
                <p className="text-xs text-muted-foreground">
                  Soma dos custos do evento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo do Evento</CardTitle>
                <Scale className={`w-4 h-4 ${saldoEvento >= 0 ? "text-green-600" : "text-destructive"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldoEvento >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatCurrency(saldoEvento)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receitas pagas − Despesas
                </p>
              </CardContent>
            </Card>

            {/* Quebra por categoria e status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Equipe Pagas</CardTitle>
                <Check className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{resumoCategorias.equipePagaQtd}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(resumoCategorias.equipePagaValor)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Equipe Não Pagas</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{resumoCategorias.equipeNaoPagaQtd}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(resumoCategorias.equipeNaoPagaValor)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Participantes Pagos</CardTitle>
                <Check className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{resumoCategorias.participantePagaQtd}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(resumoCategorias.participantePagaValor)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Participantes Não Pagos</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{resumoCategorias.participanteNaoPagaQtd}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(resumoCategorias.participanteNaoPagaValor)}</p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Previsão de Recebimentos</CardTitle>
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="w-48">
                    <Label className="text-xs text-muted-foreground">Até a data</Label>
                    <DateInput
                      value={dataPrevisaoInput}
                      onChange={setDataPrevisaoInput}
                      placeholder="DD/MM/AAAA"
                      maxDate={new Date(2099, 11, 31)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAplicarPrevisao}
                    disabled={!dataPrevisaoInput}
                    className="shrink-0"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Aplicar
                  </Button>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${totalPrevisaoPorData > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {dataPrevisao ? formatCurrency(totalPrevisaoPorData) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dataPrevisao ? "valor previsto até a data" : "selecione uma data"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="receitas">
            <TabsList>
              <TabsTrigger value="receitas">Receitas</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
            </TabsList>

            <TabsContent value="receitas" className="space-y-3">
              <div className="flex flex-wrap gap-3 items-end">
                <SearchInput
                  placeholder="Buscar por nome..."
                  value={searchNome}
                  onChange={setSearchNome}
                  className="max-w-sm w-full"
                />
                <Select value={filtroGenero} onValueChange={setFiltroGenero}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : inscricoesFiltradas.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {searchNome ? "Nenhum resultado encontrado." : "Nenhuma inscrição registrada."}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <Table className="min-w-max">
                    <TableHeader className="sticky top-0 z-10 bg-card">
                       <TableRow>
                         <TableHead className="w-12">
                           <Checkbox
                             checked={inscricoesFiltradas.length > 0 && selectedIds.length === inscricoesFiltradas.length}
                             onCheckedChange={(v) => toggleSelectAll(!!v)}
                             aria-label="Selecionar todos"
                           />
                         </TableHead>
                         {isCol("nome") && <TableHead>Nome</TableHead>}
                         {isCol("tipo") && <TableHead><ColumnFilterPopover title="Tipo" options={columnUniqueValues["tipo"] || []} selected={columnFilters["tipo"] || new Set(columnUniqueValues["tipo"] || [])} onChange={(s) => setColumnFilter("tipo", s)} /></TableHead>}
                         {isCol("genero") && <TableHead><ColumnFilterPopover title="Gênero" options={columnUniqueValues["genero"] || []} selected={columnFilters["genero"] || new Set(columnUniqueValues["genero"] || [])} onChange={(s) => setColumnFilter("genero", s)} /></TableHead>}
                         {isCol("referencia") && (
                           <TableHead>
                             <button
                               type="button"
                               onClick={toggleSortRef}
                               className="inline-flex items-center gap-1 hover:text-foreground"
                               title="Ordenar por referência"
                             >
                               Referência
                               {sortRefDir === "asc" ? (
                                 <ArrowUp className="w-3.5 h-3.5" />
                               ) : sortRefDir === "desc" ? (
                                 <ArrowDown className="w-3.5 h-3.5" />
                               ) : (
                                 <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                               )}
                             </button>
                           </TableHead>
                         )}
                         {isCol("casa_refugio") && <TableHead><ColumnFilterPopover title="Casa Refúgio" options={columnUniqueValues["casa_refugio"] || []} selected={columnFilters["casa_refugio"] || new Set(columnUniqueValues["casa_refugio"] || [])} onChange={(s) => setColumnFilter("casa_refugio", s)} /></TableHead>}
                         {isCol("condominio") && <TableHead><ColumnFilterPopover title="Condomínio" options={columnUniqueValues["condominio"] || []} selected={columnFilters["condominio"] || new Set(columnUniqueValues["condominio"] || [])} onChange={(s) => setColumnFilter("condominio", s)} /></TableHead>}
                         {isCol("funcao") && <TableHead><ColumnFilterPopover title="Função" options={columnUniqueValues["funcao"] || []} selected={columnFilters["funcao"] || new Set(columnUniqueValues["funcao"] || [])} onChange={(s) => setColumnFilter("funcao", s)} /></TableHead>}
                         {isCol("valor_inscricao") && <TableHead>Valor Inscrição</TableHead>}
                         {isCol("valor_pago") && <TableHead>Valor Pago</TableHead>}
                         {isCol("saldo") && <TableHead>Saldo</TableHead>}
                         {isCol("previsoes") && <TableHead>Previsões</TableHead>}
                         {isCol("forma_pagamento") && <TableHead><ColumnFilterPopover title="Forma Pgto" options={columnUniqueValues["forma_pagamento"] || []} selected={columnFilters["forma_pagamento"] || new Set(columnUniqueValues["forma_pagamento"] || [])} onChange={(s) => setColumnFilter("forma_pagamento", s)} /></TableHead>}
                         {isCol("status") && <TableHead><ColumnFilterPopover title="Status" options={columnUniqueValues["status"] || []} selected={columnFilters["status"] || new Set(columnUniqueValues["status"] || [])} onChange={(s) => setColumnFilter("status", s)} /></TableHead>}
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inscricoesFiltradas.map((inscricao) => {
                        const valorInsc = inscricao.valor_inscricao || 0;
                        const valorPg = inscricao.valor_pago || 0;
                        const saldo = Math.max(0, valorInsc - valorPg);
                        const previsoes = inscricao.previsoes_pagamento as Array<{ data: string; valor: number }> | null;
                        const temPrevisao = previsoes && Array.isArray(previsoes) && previsoes.length > 0;
                        return (
                          <TableRow key={inscricao.id} className={normalizeStatus(inscricao.status_pagamento) === "pendente" ? "bg-yellow-50 hover:bg-yellow-100" : ""}>
                            {isCol("nome") && (
                              <TableCell className="font-medium">
                                <span className="flex items-center gap-1.5">
                                  {inscricao.nome}
                                  {temPrevisao && (
                                    <CalendarClock className="w-3.5 h-3.5 text-primary shrink-0" />
                                  )}
                                </span>
                              </TableCell>
                            )}
                             {isCol("tipo") && <TableCell>{TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao || ""] || inscricao.tipo_inscricao || "—"}</TableCell>}
                             {isCol("genero") && <TableCell>{getColumnValue(inscricao, "genero")}</TableCell>}
                             {isCol("referencia") && <TableCell>{inscricao.referencia || "—"}</TableCell>}
                            {isCol("casa_refugio") && <TableCell>{getMemberCasaRefugio(inscricao.member_id)}</TableCell>}
                            {isCol("condominio") && <TableCell>{getMemberCondominio(inscricao.member_id)}</TableCell>}
                            {isCol("funcao") && <TableCell className="text-xs max-w-[200px]">{getMemberFuncoes(inscricao.member_id)}</TableCell>}
                            {isCol("valor_inscricao") && <TableCell>{formatCurrency(valorInsc)}</TableCell>}
                            {isCol("valor_pago") && <TableCell className="font-medium text-green-600">{formatCurrency(valorPg)}</TableCell>}
                            {isCol("saldo") && (
                              <TableCell className={saldo > 0 ? "font-medium text-yellow-600" : "font-medium text-green-600"}>
                                {formatCurrency(saldo)}
                              </TableCell>
                            )}
                            {isCol("previsoes") && (
                              <TableCell className="text-xs max-w-[200px]">
                                {temPrevisao ? (
                                  <div className="space-y-0.5">
                                    {previsoes!.map((p, idx) => (
                                      <div key={idx}>{formatDateBR(p.data)}: {formatCurrency(parseFloat(String(p.valor)) || 0)}</div>
                                    ))}
                                  </div>
                                ) : "—"}
                              </TableCell>
                            )}
                            {isCol("forma_pagamento") && <TableCell>{formatFormaPagamentoComValor(inscricao)}</TableCell>}
                            {isCol("status") && <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="despesas">
              <ImpactoDespesasTab eventoId={selectedEventoId} eventoNome={eventoNomeFinanceiro} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {selectedEventoId && (
        <FinalizarEventoDialog
          open={finalizarOpen}
          onOpenChange={setFinalizarOpen}
          eventoId={selectedEventoId}
          eventoNome={selectedEvento?.titulo || ""}
          onFinalized={() => {
            setSelectedEventoId("");
          }}
        />
      )}

      {selectedEventoId && (
        <EnvioEmergenciaDialog
          open={emergenciaOpen}
          onOpenChange={setEmergenciaOpen}
          eventoId={selectedEventoId}
          eventoTipo={(impactoEventos || []).some((e) => e.id === selectedEventoId) ? "impacto" : "agenda"}
          eventoTitulo={selectedEvento?.titulo || ""}
        />
      )}
    </div>
  );
};

export default ImpactoFinanceiroTab;
