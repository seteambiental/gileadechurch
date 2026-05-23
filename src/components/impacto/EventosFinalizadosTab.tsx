import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/masks";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Users,
  Loader2,
  DollarSign,
  ArrowDownCircle,
  Scale,
  TrendingUp,
  Clock,
  Plus,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { todayDateStr } from "@/lib/date-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDF } from "@/lib/export";
import { FileText, MessageCircle } from "lucide-react";
import EnvioEmergenciaDialog from "@/components/impacto/EnvioEmergenciaDialog";

const TIPOS_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
  ministrador: "Ministrador",
};

const CATEGORIAS_DESPESA = [
  "Chácara", "Decoração", "Alimentação", "Transporte", "Material",
  "Equipamento", "Comunicação", "Outros",
];

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "credito", label: "Cartão Crédito" },
  { value: "debito", label: "Cartão Débito" },
  { value: "transferencia", label: "Transferência" },
];

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

const EventosFinalizadosTab = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchNome, setSearchNome] = useState("");
  const [searchStatus, setSearchStatus] = useState("todos");

  // Payment dialog state
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [pagamentoInscricao, setPagamentoInscricao] = useState<any>(null);
  const [pagamentoValor, setPagamentoValor] = useState("");
  const [pagamentoForma, setPagamentoForma] = useState("pix");

  // Expense dialog state
  const [despesaOpen, setDespesaOpen] = useState(false);
  const [despesaEvento, setDespesaEvento] = useState<{ id: string; titulo: string } | null>(null);
  const [despesaDescricao, setDespesaDescricao] = useState("");
  const [despesaValor, setDespesaValor] = useState("");
  const [despesaCategoria, setDespesaCategoria] = useState("Outros");
  const [despesaData, setDespesaData] = useState(todayDateStr());

  // WhatsApp dialog state
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappEvento, setWhatsappEvento] = useState<{ id: string; titulo: string } | null>(null);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["impacto-eventos-finalizados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, data_fim, tipo, finalizado_em")
        .eq("finalizado", true)
        .order("finalizado_em", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["impacto-inscricoes-finalizados", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("id, nome, genero, tipo_inscricao, valor_inscricao, valor_pago, status_pagamento, referencia, forma_pagamento, pagamentos")
        .eq("evento_id", expandedId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedId,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["impacto-despesas-finalizados", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      const { data, error } = await supabase
        .from("impacto_despesas")
        .select("categoria, descricao, valor, data_despesa")
        .eq("evento_id", expandedId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!expandedId,
  });

  const resolveGenero = (g: string | null) => {
    if (!g) return "—";
    const lower = g.toLowerCase();
    if (lower === "m" || lower === "masculino") return "Masculino";
    if (lower === "f" || lower === "feminino") return "Feminino";
    return g;
  };

  const normalizeStatus = (status: string | null | undefined): "pago" | "parcial" | "pendente" => {
    const s = String(status || "").toLowerCase().trim();
    if (["pago", "confirmado", "aprovado", "quitado", "pago_total"].includes(s)) return "pago";
    if (["parcial", "parcialmente_pago", "parcialmente pago", "pago_parcial"].includes(s)) return "parcial";
    return "pendente";
  };

  const getStatusLabel = (status: string | null | undefined) => {
    const n = normalizeStatus(status);
    if (n === "pago") return "Pago";
    if (n === "parcial") return "Parcial";
    return "Pendente";
  };

  const filteredEventos = useMemo(() => {
    if (!search.trim()) return eventos;
    const q = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return eventos.filter((e: any) =>
      (e.titulo || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [eventos, search]);

  const filteredInscricoes = useMemo(() => {
    let result = inscricoes;
    if (searchNome.trim()) {
      const q = searchNome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      result = result.filter((i: any) =>
        (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
      );
    }
    if (searchStatus !== "todos") {
      result = result.filter((i: any) => normalizeStatus(i.status_pagamento) === searchStatus);
    }
    return result;
  }, [inscricoes, searchNome, searchStatus]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setSearchNome("");
    setSearchStatus("todos");
  };

  // Stats per expanded event
  const stats = useMemo(() => {
    if (!inscricoes.length) return { total: 0, masc: 0, fem: 0, participantes: 0, equipe: 0, receita: 0, recebido: 0, aReceber: 0 };
    let masc = 0, fem = 0, participantes = 0, equipe = 0, receita = 0, recebido = 0, aReceber = 0;
    inscricoes.forEach((i: any) => {
      const g = (i.genero || "").toLowerCase();
      if (g === "m" || g === "masculino") masc++;
      else if (g === "f" || g === "feminino") fem++;
      const tipo = (i.tipo_inscricao || "").toLowerCase();
      if (tipo === "membro" || tipo === "nao_membro") participantes++;
      else if (tipo === "equipe" || tipo === "familia" || tipo === "ministrador") equipe++;
      receita += parseFloat(i.valor_inscricao) || 0;
      recebido += parseFloat(i.valor_pago) || 0;
      const norm = normalizeStatus(i.status_pagamento);
      if (norm === "pendente") aReceber += parseFloat(i.valor_inscricao) || 0;
      else if (norm === "parcial") aReceber += Math.max(0, (parseFloat(i.valor_inscricao) || 0) - (parseFloat(i.valor_pago) || 0));
    });
    return { total: inscricoes.length, masc, fem, participantes, equipe, receita, recebido, aReceber };
  }, [inscricoes]);

  const totalDespesas = useMemo(() => {
    return (despesas as any[]).reduce((sum, d) => sum + (d.valor || 0), 0);
  }, [despesas]);

  const saldoEvento = stats.recebido - totalDespesas;

  // Payment mutation
  const pagamentoMutation = useMutation({
    mutationFn: async ({ inscricaoId, valor, forma }: { inscricaoId: string; valor: number; forma: string }) => {
      // Get current inscription data
      const { data: insc, error: fetchErr } = await supabase
        .from("impacto_inscricoes")
        .select("valor_pago, valor_inscricao, pagamentos")
        .eq("id", inscricaoId)
        .single();
      if (fetchErr) throw fetchErr;

      const currentPago = parseFloat(String(insc.valor_pago)) || 0;
      const newPago = currentPago + valor;
      const valorInsc = parseFloat(String(insc.valor_inscricao)) || 0;
      const newStatus = newPago >= valorInsc ? "pago" : newPago > 0 ? "parcial" : "pendente";

      const currentPagamentos = Array.isArray(insc.pagamentos) ? insc.pagamentos : [];
      const newPagamentos = [...currentPagamentos, { tipo: forma, valor: String(valor) }];

      const { error } = await supabase
        .from("impacto_inscricoes")
        .update({
          valor_pago: newPago,
          status_pagamento: newStatus,
          forma_pagamento: forma,
          pagamentos: newPagamentos,
        })
        .eq("id", inscricaoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-finalizados", expandedId] });
      setPagamentoOpen(false);
      setPagamentoValor("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao registrar pagamento.");
    },
  });

  // Expense mutation
  const despesaMutation = useMutation({
    mutationFn: async ({ eventoId, descricao, valor, categoria, data }: { eventoId: string; descricao: string; valor: number; categoria: string; data: string }) => {
      const { error } = await supabase
        .from("impacto_despesas")
        .insert({ evento_id: eventoId, descricao, valor, categoria, data_despesa: data });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["impacto-despesas-finalizados", expandedId] });
      setDespesaOpen(false);
      setDespesaDescricao("");
      setDespesaValor("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao registrar despesa.");
    },
  });

  const handleOpenPagamento = (insc: any) => {
    setPagamentoInscricao(insc);
    setPagamentoValor("");
    setPagamentoForma("pix");
    setPagamentoOpen(true);
  };

  const handleOpenDespesa = (evento: { id: string; titulo: string }) => {
    setDespesaEvento(evento);
    setDespesaDescricao("");
    setDespesaValor("");
    setDespesaCategoria("Outros");
    setDespesaData(todayDateStr());
    setDespesaOpen(true);
  };

  const handleSavePagamento = () => {
    const valor = parseFloat(pagamentoValor);
    if (!valor || valor <= 0) { toast.error("Informe um valor válido."); return; }
    if (!pagamentoInscricao) return;
    pagamentoMutation.mutate({ inscricaoId: pagamentoInscricao.id, valor, forma: pagamentoForma });
  };

  const handleSaveDespesa = () => {
    const valor = parseFloat(despesaValor);
    if (!valor || valor <= 0) { toast.error("Informe um valor válido."); return; }
    if (!despesaDescricao.trim()) { toast.error("Informe a descrição."); return; }
    if (!despesaEvento) return;
    despesaMutation.mutate({ eventoId: despesaEvento.id, descricao: despesaDescricao, valor, categoria: despesaCategoria, data: despesaData });
  };

  const handleGerarRelatorio = (evento: any) => {
    const doc = new jsPDF({ orientation: "portrait" });

    doc.setFontSize(16);
    doc.text(`Relatório Financeiro — ${evento.titulo}`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const periodo = `${format(parseLocalDate(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}${
      evento.data_fim && evento.data_fim !== evento.data_inicio
        ? ` a ${format(parseLocalDate(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`
        : ""
    }`;
    doc.text(`Período do evento: ${periodo}`, 14, 25);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 30);

    // ===== Resumo Geral =====
    let yPos = 38;
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.setFont(undefined, "bold");
    doc.text("Resumo Geral do Evento", 14, yPos);
    doc.setFont(undefined, "normal");
    yPos += 6;

    doc.setFontSize(9);
    doc.setTextColor(60);
    const resumoLinhas: Array<[string, string]> = [
      ["Inscrições", String(stats.total)],
      ["Participantes", String(stats.participantes)],
      ["Equipe / Apoio", String(stats.equipe)],
      ["Total Previsto (Entradas)", formatCurrency(stats.receita)],
      ["Total Recebido", formatCurrency(stats.recebido)],
      ["A Receber", formatCurrency(stats.aReceber)],
      ["Total de Despesas (Saídas)", formatCurrency(totalDespesas)],
      ["Saldo Final do Evento", formatCurrency(saldoEvento)],
    ];
    const colWidth = 95;
    const half = Math.ceil(resumoLinhas.length / 2);
    resumoLinhas.forEach(([label, val], idx) => {
      const col = idx < half ? 0 : 1;
      const row = idx < half ? idx : idx - half;
      doc.text(`${label}: ${val}`, 14 + col * colWidth, yPos + row * 5);
    });
    yPos += half * 5 + 4;

    // ===== Entradas por forma de pagamento =====
    const totalByFormaPgto = (inscricoes as any[]).reduce((acc: Record<string, number>, i: any) => {
      const pagamentos = Array.isArray(i.pagamentos) ? i.pagamentos : [];
      if (pagamentos.length > 0) {
        pagamentos.forEach((p: any) => {
          const tipo = p?.tipo || "outros";
          acc[tipo] = (acc[tipo] || 0) + (Number(p?.valor) || 0);
        });
      } else if (i.forma_pagamento && Number(i.valor_pago) > 0) {
        acc[i.forma_pagamento] = (acc[i.forma_pagamento] || 0) + (Number(i.valor_pago) || 0);
      }
      return acc;
    }, {});
    const formasOrdenadas = Object.entries(totalByFormaPgto).sort(([, a], [, b]) => (b as number) - (a as number));
    if (formasOrdenadas.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.setFont(undefined, "bold");
      doc.text("Entradas por Forma de Pagamento", 14, yPos);
      doc.setFont(undefined, "normal");
      yPos += 5;
      doc.setFontSize(9);
      doc.setTextColor(60);
      formasOrdenadas.forEach(([forma, val]) => {
        doc.text(`  ${FORMAS_PAGAMENTO_LABELS[forma] || forma}: ${formatCurrency(val as number)}`, 14, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    // ===== Saídas por categoria =====
    const totalByCategoria = (despesas as any[]).reduce((acc: Record<string, number>, d: any) => {
      const cat = d.categoria || "Outros";
      acc[cat] = (acc[cat] || 0) + (Number(d.valor) || 0);
      return acc;
    }, {});
    const categoriasOrdenadas = Object.entries(totalByCategoria).sort(([, a], [, b]) => (b as number) - (a as number));
    if (categoriasOrdenadas.length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.setFont(undefined, "bold");
      doc.text("Saídas por Categoria", 14, yPos);
      doc.setFont(undefined, "normal");
      yPos += 5;
      doc.setFontSize(9);
      doc.setTextColor(60);
      categoriasOrdenadas.forEach(([cat, val]) => {
        doc.text(`  ${cat}: ${formatCurrency(val as number)}`, 14, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    // ===== Detalhamento das Despesas =====
    if ((despesas as any[]).length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(40);
      doc.setFont(undefined, "bold");
      doc.text("Detalhamento das Despesas", 14, yPos);
      doc.setFont(undefined, "normal");
      yPos += 3;

      const tableData = (despesas as any[]).map((d: any) => [
        d.categoria || "—",
        d.descricao || "—",
        d.data_despesa ? format(parseLocalDate(d.data_despesa), "dd/MM/yyyy") : "—",
        formatCurrency(Number(d.valor) || 0),
      ]);
      tableData.push(["TOTAL", "", "", formatCurrency(totalDespesas)]);

      autoTable(doc, {
        head: [["Categoria", "Descrição", "Data", "Valor"]],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: "bold" },
        didParseCell: (hookData: any) => {
          if (hookData.section !== "body") return;
          if (hookData.row.index === tableData.length - 1) {
            hookData.cell.styles.fillColor = [230, 230, 230];
            hookData.cell.styles.fontStyle = "bold";
          }
        },
      });
      yPos = (doc as any).lastAutoTable?.finalY || yPos;
    }

    // Rodapé com saldo final destacado
    let footerY = yPos + 8;
    if (footerY > 270) {
      doc.addPage();
      footerY = 20;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(saldoEvento >= 0 ? 25 : 200, saldoEvento >= 0 ? 135 : 35, saldoEvento >= 0 ? 84 : 51);
    doc.text(`Saldo Final do Evento: ${formatCurrency(saldoEvento)}`, 14, footerY);
    doc.setFont(undefined, "normal");
    doc.setTextColor(120);
    doc.setFontSize(8);
    doc.text(
      `(Total Recebido ${formatCurrency(stats.recebido)}  -  Total de Despesas ${formatCurrency(totalDespesas)})`,
      14,
      footerY + 5,
    );

    const safeNome = (evento.titulo || "evento").replace(/[^a-zA-Z0-9-_]/g, "_");
    savePDF(doc, `RelatorioFinanceiro_${safeNome}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold">Eventos Finalizados</h2>
        <p className="text-sm text-muted-foreground">
          Eventos encerrados e arquivados com seus dados consolidados
        </p>
      </div>

      {eventos.length > 3 && (
        <SearchInput
          placeholder="Buscar evento..."
          value={search}
          onChange={setSearch}
          className="max-w-sm"
        />
      )}

      {filteredEventos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Archive className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Nenhum evento finalizado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Eventos finalizados nas abas Inscrições ou Financeiro aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredEventos.map((evento: any) => {
            const isExpanded = expandedId === evento.id;
            return (
              <Card key={evento.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(evento.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <p className="font-medium">{evento.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseLocalDate(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                            {evento.data_fim && evento.data_fim !== evento.data_inicio
                              ? ` → ${format(parseLocalDate(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {evento.finalizado_em && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Finalizado em {format(new Date(evento.finalizado_em), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        <Badge variant="secondary" className="gap-1">
                          <Archive className="w-3 h-3" />
                          Arquivado
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4 pt-3 space-y-4">
                      {loadingInscricoes ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : inscricoes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma inscrição registrada para este evento.
                        </p>
                      ) : (
                        <>
                          {/* Summary cards - full financial */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-lg font-bold">{stats.total}</p>
                              <p className="text-[10px] text-muted-foreground">{stats.masc}M / {stats.fem}F</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {stats.participantes} part. / {stats.equipe} equipe
                              </p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <p className="text-xs text-muted-foreground">Previsão</p>
                              <p className="text-lg font-bold">{formatCurrency(stats.receita)}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <DollarSign className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">Recebido</p>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(stats.recebido)}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Clock className="w-3.5 h-3.5 text-yellow-600" />
                              </div>
                              <p className="text-xs text-muted-foreground">A Receber</p>
                              <p className="text-lg font-bold text-yellow-600">{formatCurrency(stats.aReceber)}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <ArrowDownCircle className="w-3.5 h-3.5 text-destructive" />
                              </div>
                              <p className="text-xs text-muted-foreground">Despesas</p>
                              <p className="text-lg font-bold text-destructive">{formatCurrency(totalDespesas)}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Scale className={`w-3.5 h-3.5 ${saldoEvento >= 0 ? "text-green-600" : "text-destructive"}`} />
                              </div>
                              <p className="text-xs text-muted-foreground">Saldo</p>
                              <p className={`text-lg font-bold ${saldoEvento >= 0 ? "text-green-600" : "text-destructive"}`}>
                                {formatCurrency(saldoEvento)}
                              </p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 text-center flex items-center justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleOpenDespesa({ id: evento.id, titulo: evento.titulo }); }}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Despesa
                              </Button>
                            </div>
                          </div>

                          {/* Botão de relatório */}
                          <div className="flex justify-end gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-600 text-green-700 hover:bg-green-50 hover:text-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWhatsappEvento({ id: evento.id, titulo: evento.titulo });
                                setWhatsappOpen(true);
                              }}
                            >
                              <MessageCircle className="w-3.5 h-3.5 mr-1" />
                              Enviar WhatsApp
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleGerarRelatorio(evento); }}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Gerar Relatório (PDF)
                            </Button>
                          </div>

                          {/* Search filters */}
                          <div className="flex flex-wrap gap-3 items-end">
                            <SearchInput
                              placeholder="Buscar participante..."
                              value={searchNome}
                              onChange={setSearchNome}
                              className="max-w-xs w-full"
                            />
                            <Select value={searchStatus} onValueChange={setSearchStatus}>
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="parcial">Parcial</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Participants table */}
                          <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Ref.</TableHead>
                                  <TableHead>Nome</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Gênero</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Pago</TableHead>
                                  <TableHead>Saldo</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredInscricoes.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                                      Nenhum resultado encontrado.
                                    </TableCell>
                                  </TableRow>
                                ) : filteredInscricoes.map((insc: any) => {
                                  const valorInsc = parseFloat(insc.valor_inscricao) || 0;
                                  const valorPago = parseFloat(insc.valor_pago) || 0;
                                  const saldo = Math.max(0, valorInsc - valorPago);
                                  const status = normalizeStatus(insc.status_pagamento);
                                  return (
                                    <TableRow
                                      key={insc.id}
                                      className={status === "pendente" ? "bg-yellow-50 hover:bg-yellow-100" : ""}
                                    >
                                      <TableCell className="text-xs font-mono text-muted-foreground">
                                        {insc.referencia || "—"}
                                      </TableCell>
                                      <TableCell className="font-medium">{insc.nome}</TableCell>
                                      <TableCell className="text-sm">
                                        {TIPOS_LABELS[insc.tipo_inscricao] || insc.tipo_inscricao || "—"}
                                      </TableCell>
                                      <TableCell className="text-sm">{resolveGenero(insc.genero)}</TableCell>
                                      <TableCell className="text-sm">
                                        {valorInsc > 0 ? formatCurrency(valorInsc) : "—"}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-green-600">
                                        {valorPago > 0 ? formatCurrency(valorPago) : "—"}
                                      </TableCell>
                                      <TableCell className={`text-sm font-medium ${saldo > 0 ? "text-yellow-600" : "text-green-600"}`}>
                                        {formatCurrency(saldo)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={status === "pago" ? "default" : "secondary"}
                                          className={
                                            status === "pago" ? "bg-green-600 text-white" :
                                            status === "parcial" ? "bg-yellow-600 text-white" : ""
                                          }
                                        >
                                          {status === "pago" && <Check className="w-3 h-3 mr-1" />}
                                          {status === "parcial" && <Clock className="w-3 h-3 mr-1" />}
                                          {getStatusLabel(insc.status_pagamento)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {status !== "pago" && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenPagamento(insc)}
                                            className="text-xs"
                                          >
                                            <DollarSign className="w-3.5 h-3.5 mr-1" />
                                            Lançar Pgto
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={pagamentoOpen} onOpenChange={setPagamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Pagamento Pós-Finalização</DialogTitle>
          </DialogHeader>
          {pagamentoInscricao && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{pagamentoInscricao.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Valor inscrição: {formatCurrency(parseFloat(pagamentoInscricao.valor_inscricao) || 0)} |
                  Já pago: {formatCurrency(parseFloat(pagamentoInscricao.valor_pago) || 0)} |
                  Saldo: {formatCurrency(Math.max(0, (parseFloat(pagamentoInscricao.valor_inscricao) || 0) - (parseFloat(pagamentoInscricao.valor_pago) || 0)))}
                </p>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagamentoValor}
                  onChange={(e) => setPagamentoValor(e.target.value)}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={pagamentoForma} onValueChange={setPagamentoForma}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePagamento} disabled={pagamentoMutation.isPending}>
              {pagamentoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={despesaOpen} onOpenChange={setDespesaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Despesa Pós-Finalização</DialogTitle>
          </DialogHeader>
          {despesaEvento && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{despesaEvento.titulo}</p>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={despesaDescricao}
                  onChange={(e) => setDespesaDescricao(e.target.value)}
                  placeholder="Descreva a despesa..."
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={despesaValor}
                    onChange={(e) => setDespesaValor(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={despesaCategoria} onValueChange={setDespesaCategoria}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_DESPESA.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data</Label>
                <DateInput
                  value={despesaData}
                  onChange={setDespesaData}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDespesaOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDespesa} disabled={despesaMutation.isPending}>
              {despesaMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp dialog (reaproveita EnvioEmergenciaDialog com filtros por tipo) */}
      {whatsappEvento && (
        <EnvioEmergenciaDialog
          open={whatsappOpen}
          onOpenChange={(o) => {
            setWhatsappOpen(o);
            if (!o) setWhatsappEvento(null);
          }}
          eventoId={whatsappEvento.id}
          eventoTipo="impacto"
          eventoTitulo={whatsappEvento.titulo}
        />
      )}
    </div>
  );
};

export default EventosFinalizadosTab;
