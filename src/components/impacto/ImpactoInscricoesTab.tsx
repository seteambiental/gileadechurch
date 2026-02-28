import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/masks";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Printer, Tag, Pencil, Search, FileSpreadsheet, FileText, Columns3, X, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import ImpactoInscricaoFormDialog from "./ImpactoInscricaoFormDialog";
import { exportGenericToExcel, exportGenericToPDF } from "@/lib/export";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


interface ImpactoInscricoesTabProps {
  eventoSelecionado?: string;
  onEventoChange?: (id: string) => void;
}

const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  vale: "Vale",
  misto: "Misto",
};

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Família",
  equipe: "Equipe (apoio/serviço)",
};

// All available column keys (used for both table and export)
const ALL_COLUMNS = [
  { key: "referencia", label: "Ref." },
  { key: "nome", label: "Nome" },
  { key: "tipo", label: "Tipo" },
  { key: "genero", label: "Gênero" },
  { key: "telefone", label: "Telefone" },
  { key: "local", label: "Casa Refúgio / Condomínio" },
  { key: "forma_pagamento", label: "Forma Pagamento" },
  { key: "valor_inscricao", label: "Valor Inscrição" },
  { key: "valor_pago", label: "Valor Pago" },
  { key: "a_pagar", label: "A Pagar" },
  { key: "status", label: "Status" },
  { key: "whatsapp", label: "WhatsApp" },
] as const;

type ColumnKey = typeof ALL_COLUMNS[number]["key"];

const DEFAULT_VISIBLE_COLUMNS = new Set<string>(
  ALL_COLUMNS.map((c) => c.key)
);

const ImpactoInscricoesTab = ({ eventoSelecionado, onEventoChange }: ImpactoInscricoesTabProps) => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInscricao, setEditingInscricao] = useState<any>(null);
  const [selectedEventoId, setSelectedEventoIdLocal] = useState(eventoSelecionado || "");
  const setSelectedEventoId = (id: string) => {
    setSelectedEventoIdLocal(id);
    onEventoChange?.(id);
  };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchNome, setSearchNome] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));
  const [deletingInscricao, setDeletingInscricao] = useState<{ id: string; source?: string; nome: string } | null>(null);
  useEffect(() => {
    if (eventoSelecionado) setSelectedEventoIdLocal(eventoSelecionado);
  }, [eventoSelecionado]);
  // Fetch impacto_eventos (unified dropdown)
  const { data: impactoEventos = [] } = useQuery({
    queryKey: ["impacto-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("*")
        .eq("ativo", true)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agenda events with inscricao enabled (non-recurring)
  const { data: agendaEventos } = useQuery({
    queryKey: ["agenda-eventos-inscricao-for-impacto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim, local, limite_vagas, ativo, tem_custo, valores_por_tipo")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Unify both sources into a single list for the dropdown
  const eventos = useMemo(() => {
    const impacto = (impactoEventos || []).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_inicio,
      source: "impacto" as const,
    }));
    const agenda = (agendaEventos || []).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_evento,
      source: "agenda" as const,
    }));
    // Deduplicate by ID (impacto takes priority)
    const impactoIds = new Set(impacto.map((e) => e.id));
    const uniqueAgenda = agenda.filter((e) => !impactoIds.has(e.id));
    return [...impacto, ...uniqueAgenda].sort((a, b) =>
      new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
    );
  }, [impactoEventos, agendaEventos]);

  // Determine if selected event is from agenda_igreja or impacto_eventos
  const selectedEventoSource = useMemo(
    () => eventos.find((e) => e.id === selectedEventoId)?.source || "impacto",
    [eventos, selectedEventoId]
  );

  // Fetch from impacto_inscricoes (admin inserts from within the app)
  const { data: rawImpactoInscricoes, isLoading: loadingImpacto } = useQuery({
    queryKey: ["impacto-inscricoes", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select(`*, member:members(id, full_name, photo_url, whatsapp, casa_refugio_id)`)
        .eq("evento_id", selectedEventoId) as any;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEventoId,
  });

  // Fetch from inscricoes_eventos — apenas as NÃO aprovadas (pendentes de aprovação)
  // Aprovadas já foram espelhadas em impacto_inscricoes pelo fluxo de aprovação
  const { data: rawAgendaInscricoes, isLoading: loadingAgenda } = useQuery({
    queryKey: ["agenda-inscricoes", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select(`id, nome_participante, telefone_contato, tipo_inscricao, status_pagamento, member_id, evento_id, member:members(id, full_name, photo_url, whatsapp, casa_refugio_id)`)
        .eq("evento_id", selectedEventoId)
        .eq("aprovado", false);
      if (error) throw error;
      return (data || []).map((i: any) => ({
        ...i,
        member_id: i.member_id,
        nome: i.nome_participante,
        telefone: i.telefone_contato,
        status_pagamento: i.status_pagamento || "pendente",
        tipo_inscricao: i.tipo_inscricao || "membro",
        source: "agenda_inscricao",
      }));
    },
    enabled: !!selectedEventoId,
  });


  // Fetch selected event details for valores_por_tipo
  const selectedEventoDetalhes = useMemo(() => {
    if (!selectedEventoId) return null;
    // Try agenda first
    const agenda = agendaEventos?.find((e) => e.id === selectedEventoId);
    if (agenda) return agenda;
    // Try impacto
    const impacto = impactoEventos?.find((e: any) => e.id === selectedEventoId);
    return impacto || null;
  }, [selectedEventoId, agendaEventos, impactoEventos]);

  const isLoading = loadingImpacto || loadingAgenda;

  const inscricoes = useMemo(() => {
    const impacto = rawImpactoInscricoes || [];
    const agenda = rawAgendaInscricoes || [];

    // Build lookup sets from impacto_inscricoes (the authoritative source)
    const impactoMemberIds = new Set(impacto.map((i: any) => i.member_id).filter(Boolean));
    const impactoNomes = new Set(
      impacto.map((i: any) =>
        (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      ).filter(Boolean)
    );

    // Exclude agenda records that already have a counterpart in impacto_inscricoes
    const uniqueAgenda = agenda.filter((i: any) => {
      if (i.member_id && impactoMemberIds.has(i.member_id)) return false;
      const nomeNorm = (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      if (nomeNorm && impactoNomes.has(nomeNorm)) return false;
      return true;
    });

    const all = [...impacto, ...uniqueAgenda];
    const sorted = all.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
    if (!searchNome.trim()) return sorted;
    const q = searchNome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return sorted.filter((i: any) =>
      (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [rawImpactoInscricoes, rawAgendaInscricoes, searchNome]);

  // Fetch casas refugio for name/condominio lookup
  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas-refugio-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name, condominio");
      if (error) throw error;
      return data;
    },
  });

  // Fetch member functions for supervisor/sindico identification
  const { data: memberFunctions = [] } = useQuery({
    queryKey: ["member-functions-supervisores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_functions")
        .select("member_id, function_type, casa_refugio_id, condominio_id")
        .in("function_type", ["supervisor_casa_refugio", "sindico_condominio"]);
      if (error) throw error;
      return data;
    },
  });

  // Fetch condominios for sindico lookup
  const { data: condominios = [] } = useQuery({
    queryKey: ["condominios-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const getLocationLabel = (inscricao: any) => {
    const member = inscricao.member;
    if (!member) return "-";
    
    const sindicoFunc = memberFunctions.find(
      (mf) => mf.member_id === member.id && mf.function_type === "sindico_condominio"
    );
    if (sindicoFunc?.condominio_id) {
      const cond = condominios.find((c) => c.id === sindicoFunc.condominio_id);
      if (cond) return cond.name;
    }
    
    const supervisorFunc = memberFunctions.find(
      (mf) => mf.member_id === member.id && mf.function_type === "supervisor_casa_refugio"
    );
    if (supervisorFunc?.casa_refugio_id) {
      const cr = casasRefugio.find((c) => c.id === supervisorFunc.casa_refugio_id);
      if (cr?.condominio) return cr.condominio;
    }
    
    if (member.casa_refugio_id) {
      const cr = casasRefugio.find((c) => c.id === member.casa_refugio_id);
      if (cr) return cr.name;
    }
    
    return "-";
  };

  const getPhone = (inscricao: any) => {
    return inscricao.telefone || inscricao.member?.whatsapp || "-";
  };

  const getValorPago = (inscricao: any): number => {
    const pagamentos = inscricao.pagamentos as any[] | null;
    if (pagamentos && pagamentos.length > 0) {
      return pagamentos.reduce((sum: number, p: any) => sum + (parseFloat(p.valor) || 0), 0);
    }
    return parseFloat(inscricao.valor_pago) || 0;
  };

  // Calculate "A Pagar" = valor_inscricao - valorPago
  const getValorAPagar = (inscricao: any): number => {
    const valorInscricao = parseFloat(inscricao.valor_inscricao) || 0;
    const valorPago = getValorPago(inscricao);
    const diff = valorInscricao - valorPago;
    return diff > 0 ? diff : 0;
  };

  // Get valor_inscricao from event's valores_por_tipo based on tipo_inscricao
  const getValorInscricaoEvento = (inscricao: any): number | null => {
    if (inscricao.valor_inscricao != null) return parseFloat(inscricao.valor_inscricao);
    const valores = selectedEventoDetalhes?.valores_por_tipo as Record<string, number> | null;
    if (!valores) return null;
    const tipo = inscricao.tipo_inscricao || "membro";
    return valores[tipo] ?? null;
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source?: string }) => {
      const table = source === "agenda_inscricao" ? "inscricoes_eventos" : "impacto_inscricoes";
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição removida!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", selectedEventoId] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes", selectedEventoId] });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(inscricoes.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleEdit = (inscricao: any) => {
    setEditingInscricao(inscricao);
    setFormOpen(true);
  };

  const handleNewInscricao = () => {
    setEditingInscricao(null);
    setFormOpen(true);
  };

  const printCrachas = async () => {
    const selected = inscricoes.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma inscrição");
      return;
    }

    // Fetch church logo
    const { data: configData } = await supabase
      .from("igreja_config")
      .select("logo_url, logo_dark_url")
      .limit(1)
      .single();
    const logoUrl = configData?.logo_dark_url || configData?.logo_url || "";

    const evento = eventos?.find((e) => e.id === selectedEventoId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const crachasHtml = selected.map((inscricao) => `
      <div class="cracha">
        ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
        <div class="evento">${evento?.titulo || "Impacto"}</div>
        <div class="nome">${inscricao.nome}</div>
        ${inscricao.referencia ? `<div class="ref">${inscricao.referencia}</div>` : ''}
        ${inscricao.genero ? `<div class="info">${inscricao.genero === 'M' ? 'Masculino' : 'Feminino'}</div>` : ''}
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Crachás - ${evento?.titulo}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { display: flex; flex-wrap: wrap; gap: 10px; }
        .cracha { width: 85mm; height: 55mm; border: 2px solid #333; border-radius: 8px; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-inside: avoid; }
        .logo { max-width: 60px; max-height: 30px; object-fit: contain; margin-bottom: 4px; }
        .evento { font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
        .nome { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .ref { font-size: 12px; font-weight: bold; color: #444; letter-spacing: 1px; }
        .info { font-size: 12px; color: #666; }
      </style></head><body>
      <div class="container">${crachasHtml}</div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const printEtiquetas = () => {
    const selected = inscricoes.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma inscrição");
      return;
    }

    const evento = eventos?.find((e) => e.id === selectedEventoId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const etiquetasHtml = selected.map((inscricao) => `
      <div class="etiqueta">
        <div class="nome">${inscricao.nome}</div>
        ${inscricao.referencia ? `<div class="ref">${inscricao.referencia}</div>` : ''}
        <div class="evento">${evento?.titulo || "Impacto"}</div>
        <div class="data">${evento?.data_inicio ? format(parseLocalDate(evento.data_inicio), "dd/MM/yyyy") : ''}</div>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Etiquetas de Mala - ${evento?.titulo}</title>
      <style>
        @page { size: A4; margin: 5mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { display: flex; flex-wrap: wrap; }
        .etiqueta { width: 63.5mm; height: 38.1mm; border: 1px dashed #ccc; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; page-break-inside: avoid; }
        .nome { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
        .ref { font-size: 11px; font-weight: bold; color: #444; letter-spacing: 1px; margin-bottom: 2px; }
        .evento { font-size: 11px; color: #333; }
        .data { font-size: 10px; color: #666; }
      </style></head><body>
      <div class="container">${etiquetasHtml}</div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const buildExportColumns = () => {
    const allCols: Record<string, any> = {
      referencia: { header: "Ref.", accessor: "referencia", format: (v: any) => v || "—" },
      nome: { header: "Nome", accessor: "nome" },
      tipo: { header: "Tipo", accessor: (row: any) => TIPOS_INSCRICAO_LABELS[row.tipo_inscricao] || row.tipo_inscricao || "Membro" },
      genero: { header: "Gênero", accessor: (row: any) => {
        const g = row.genero || row.member?.genero;
        if (!g) return "—";
        return { M: "Masculino", F: "Feminino", masculino: "Masculino", feminino: "Feminino" }[g] || g;
      }},
      telefone: { header: "Telefone", accessor: (row: any) => getPhone(row) },
      local: { header: "Casa Refúgio / Condomínio", accessor: (row: any) => getLocationLabel(row) },
      forma_pagamento: { header: "Forma Pagamento", accessor: (row: any) => row.forma_pagamento ? (FORMAS_PAGAMENTO_LABELS[row.forma_pagamento] || row.forma_pagamento) : "—" },
      valor_inscricao: { header: "Valor Inscrição", type: 'currency' as const, accessor: (row: any) => {
        const v = getValorInscricaoEvento(row);
        return v != null ? v : 0;
      }},
      valor_pago: { header: "Valor Pago", type: 'currency' as const, accessor: (row: any) => getValorPago(row) },
      a_pagar: { header: "A Pagar", type: 'currency' as const, accessor: (row: any) => {
        return getValorAPagar(row);
      }},
      status: { header: "Status", accessor: (row: any) => ({ pago: "Pago", parcial: "Parcial" }[row.status_pagamento] || "Pendente") },
      whatsapp: { header: "WhatsApp", accessor: (row: any) => row.member?.whatsapp || "—" },
    };
    return ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)).map((c) => allCols[c.key]);
  };

  const eventoNome = eventos?.find((e) => e.id === selectedEventoId)?.titulo || "inscricoes";

  const handleExportExcel = async () => {
    if (!inscricoes.length) { toast.error("Nenhuma inscrição para exportar."); return; }
    await exportGenericToExcel(inscricoes, buildExportColumns(), `Inscricoes_${eventoNome}`, "Inscrições");
  };

  const handleExportPDF = () => {
    if (!inscricoes.length) { toast.error("Nenhuma inscrição para exportar."); return; }
    exportGenericToPDF(inscricoes, buildExportColumns(), `Inscricoes_${eventoNome}`, `Inscrições — ${eventoNome}`);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: string) => visibleColumns.has(key);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-600 text-white">Pago</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-600 text-white">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Inscrições</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedEventoId} onValueChange={(v) => { setSelectedEventoId(v); setSearchNome(""); }}>
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
              {/* Column selector for export */}
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
                    {ALL_COLUMNS.map((col) => (
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
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </>
          )}
          {selectedEventoId && (
            <Button onClick={handleNewInscricao}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Inscrição
            </Button>
          )}
        </div>
      </div>

      {selectedEventoId && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchNome}
            onChange={(e) => setSearchNome(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchNome && (
            <button
              onClick={() => setSearchNome("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground self-center">
            {selectedIds.length} selecionado(s)
          </span>
          <Button size="sm" variant="outline" onClick={printCrachas}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Crachás
          </Button>
          <Button size="sm" variant="outline" onClick={printEtiquetas}>
            <Tag className="w-4 h-4 mr-2" />
            Etiquetas de Mala
          </Button>
        </div>
      )}

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver as inscrições.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : inscricoes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma inscrição registrada para este evento.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[1200px]">
             <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === inscricoes.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                {isCol("referencia") && <TableHead>Ref.</TableHead>}
                <TableHead></TableHead>
                {isCol("nome") && <TableHead>Nome</TableHead>}
                {isCol("tipo") && <TableHead>Tipo</TableHead>}
                {isCol("genero") && <TableHead>Gênero</TableHead>}
                {isCol("telefone") && <TableHead>Telefone</TableHead>}
                {isCol("local") && <TableHead>Casa Refúgio / Condomínio</TableHead>}
                {isCol("forma_pagamento") && <TableHead>Forma Pagamento</TableHead>}
                {isCol("valor_inscricao") && <TableHead>Valor Inscrição</TableHead>}
                {isCol("a_pagar") && <TableHead>A Pagar</TableHead>}
                {isCol("valor_pago") && <TableHead>Valor Pago</TableHead>}
                {isCol("status") && <TableHead>Status</TableHead>}
                {isCol("whatsapp") && <TableHead>WhatsApp</TableHead>}
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inscricoes.map((inscricao) => {
                const valorPago = getValorPago(inscricao);
                const valorInscricao = getValorInscricaoEvento(inscricao);
                const aPagar = valorInscricao != null
                  ? Math.max(0, valorInscricao - valorPago)
                  : null;
                return (
                  <TableRow key={inscricao.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(inscricao.id)}
                        onCheckedChange={(checked) => handleSelect(inscricao.id, !!checked)}
                      />
                    </TableCell>
                    {isCol("referencia") && <TableCell className="text-xs font-mono text-muted-foreground">{inscricao.referencia || "—"}</TableCell>}
                    <TableCell>
                      {inscricao.member?.photo_url ? (
                        <img src={inscricao.member.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {(inscricao.nome || "?")[0]?.toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                    {isCol("nome") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {inscricao.nome}
                          <button
                            title={inscricao.aprovado ? "Aprovado" : "Clique para aprovar"}
                            onClick={async () => {
                              if (inscricao.aprovado) return;
                              const { error } = await supabase
                                .from("impacto_inscricoes")
                                .update({ aprovado: true } as any)
                                .eq("id", inscricao.id);
                              if (error) {
                                toast.error("Erro ao aprovar inscrição");
                              } else {
                                toast.success(`Inscrição de ${inscricao.nome} aprovada!`);
                                queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", selectedEventoId] });
                              }
                            }}
                            className={`flex-shrink-0 ${inscricao.aprovado ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
                          >
                            <CheckCircle className={`w-4 h-4 ${inscricao.aprovado ? "text-muted-foreground/40" : "text-green-500"}`} />
                          </button>
                        </div>
                      </TableCell>
                    )}
                    {isCol("tipo") && (
                      <TableCell className="text-sm">
                        {TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao] || "Membro"}
                      </TableCell>
                    )}
                    {isCol("genero") && (
                      <TableCell className="text-sm">
                        {(() => {
                          const g = inscricao.genero || inscricao.member?.genero;
                          if (!g) return "—";
                          return { M: "Masculino", F: "Feminino", masculino: "Masculino", feminino: "Feminino" }[g] || g;
                        })()}
                      </TableCell>
                    )}
                    {isCol("telefone") && <TableCell>{getPhone(inscricao)}</TableCell>}
                    {isCol("local") && <TableCell>{getLocationLabel(inscricao)}</TableCell>}
                    {isCol("forma_pagamento") && (
                      <TableCell>{inscricao.forma_pagamento ? (FORMAS_PAGAMENTO_LABELS[inscricao.forma_pagamento] || inscricao.forma_pagamento) : "—"}</TableCell>
                    )}
                    {isCol("valor_inscricao") && (
                      <TableCell className="text-sm">
                        {valorInscricao != null ? formatCurrency(valorInscricao) : "—"}
                      </TableCell>
                    )}
                    {isCol("a_pagar") && (
                      <TableCell className="text-sm font-medium">
                        {aPagar != null
                          ? aPagar > 0
                          ? <span className="text-destructive">{formatCurrency(aPagar)}</span>
                            : <span className="text-primary">Quitado</span>
                          : "—"}
                      </TableCell>
                    )}
                    {isCol("valor_pago") && (
                      <TableCell className="text-sm">
                        {valorPago > 0 ? formatCurrency(valorPago) : "—"}
                      </TableCell>
                    )}
                    {isCol("status") && <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>}
                    {isCol("whatsapp") && <TableCell>{inscricao.member?.whatsapp || "—"}</TableCell>}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(inscricao)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                           variant="ghost"
                           onClick={() => setDeletingInscricao({ id: inscricao.id, source: inscricao.source, nome: inscricao.nome })}
                         >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedEventoId && (
        <ImpactoInscricaoFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingInscricao(null);
          }}
          eventoId={selectedEventoId}
          inscricao={editingInscricao}
        />
      )}

      <ConfirmDialog
        open={!!deletingInscricao}
        onOpenChange={(open) => !open && setDeletingInscricao(null)}
        onConfirm={() => {
          if (deletingInscricao) {
            deleteMutation.mutate({ id: deletingInscricao.id, source: deletingInscricao.source });
            setDeletingInscricao(null);
          }
        }}
        title="Excluir inscrição?"
        description={`Deseja excluir a inscrição de "${deletingInscricao?.nome || ""}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  );
};

export default ImpactoInscricoesTab;
