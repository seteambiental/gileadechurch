import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate, todayDateStr } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/masks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportGenericToExcel, savePDF } from "@/lib/export";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const CATEGORIAS_DESPESA = [
  "Chácara",
  "Decoração",
  "Embalagens",
  "Outros",
  "Impressos",
  "Maquiagem",
  "Ônibus",
  "Supermercado Alimentação",
  "Higiene e Limpeza",
  "Toalhas",
];

interface DespesaForm {
  categoria: string;
  descricao: string;
  valor: string;
  data_despesa: string;
}

const emptyForm: DespesaForm = {
  categoria: "",
  descricao: "",
  valor: "",
  data_despesa: todayDateStr(),
};

interface Props {
  eventoId: string;
  eventoNome?: string;
}

const ImpactoDespesasTab = ({ eventoId, eventoNome = "evento" }: Props) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DespesaForm>(emptyForm);

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ["impacto-despesas", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_despesas")
        .select("*")
        .eq("evento_id", eventoId)
        .order("categoria");
      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
  });

  // Inscrições do evento — usadas para montar o resumo completo (entradas, a receber, saldo)
  const { data: inscricoes = [] } = useQuery({
    queryKey: ["impacto-inscricoes-resumo", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("valor_inscricao, valor_pago, status_pagamento, forma_pagamento, pagamentos, previsoes_pagamento, tipo_inscricao")
        .eq("evento_id", eventoId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventoId,
  });

  // ===== Filtros por coluna =====
  const categoriaOptions = useMemo(
    () => Array.from(new Set(despesas.map((d: any) => d.categoria).filter(Boolean))).sort() as string[],
    [despesas]
  );
  const descricaoOptions = useMemo(
    () => Array.from(new Set(despesas.map((d: any) => d.descricao || "—"))).sort() as string[],
    [despesas]
  );
  const dataOptions = useMemo(
    () =>
      Array.from(
        new Set(
          despesas.map((d: any) =>
            d.data_despesa ? format(parseLocalDate(d.data_despesa), "dd/MM/yyyy") : "—"
          )
        )
      ).sort() as string[],
    [despesas]
  );
  const valorOptions = useMemo(
    () =>
      Array.from(new Set(despesas.map((d: any) => formatCurrency(d.valor || 0)))).sort() as string[],
    [despesas]
  );

  const [filtroCategoria, setFiltroCategoria] = useState<Set<string>>(new Set());
  const [filtroDescricao, setFiltroDescricao] = useState<Set<string>>(new Set());
  const [filtroData, setFiltroData] = useState<Set<string>>(new Set());
  const [filtroValor, setFiltroValor] = useState<Set<string>>(new Set());

  useEffect(() => { setFiltroCategoria(new Set(categoriaOptions)); }, [categoriaOptions]);
  useEffect(() => { setFiltroDescricao(new Set(descricaoOptions)); }, [descricaoOptions]);
  useEffect(() => { setFiltroData(new Set(dataOptions)); }, [dataOptions]);
  useEffect(() => { setFiltroValor(new Set(valorOptions)); }, [valorOptions]);

  const despesasFiltradas = useMemo(() => {
    return despesas.filter((d: any) => {
      const cat = d.categoria || "";
      const desc = d.descricao || "—";
      const dt = d.data_despesa ? format(parseLocalDate(d.data_despesa), "dd/MM/yyyy") : "—";
      const vl = formatCurrency(d.valor || 0);
      return (
        filtroCategoria.has(cat) &&
        filtroDescricao.has(desc) &&
        filtroData.has(dt) &&
        filtroValor.has(vl)
      );
    });
  }, [despesas, filtroCategoria, filtroDescricao, filtroData, filtroValor]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        evento_id: eventoId,
        categoria: form.categoria,
        descricao: form.descricao || null,
        valor: parseFloat(form.valor) || 0,
        data_despesa: form.data_despesa,
      };

      if (editingId) {
        const { error } = await supabase
          .from("impacto_despesas")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("impacto_despesas")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impacto-despesas", eventoId] });
      toast.success(editingId ? "Despesa atualizada!" : "Despesa adicionada!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar despesa."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("impacto_despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["impacto-despesas", eventoId] });
      toast.success("Despesa removida!");
    },
    onError: () => toast.error("Erro ao remover despesa."),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      categoria: d.categoria,
      descricao: d.descricao || "",
      valor: String(d.valor || 0),
      data_despesa: d.data_despesa,
    });
    setDialogOpen(true);
  };

  const totalDespesas = despesasFiltradas.reduce((sum, d) => sum + (d.valor || 0), 0);

  // Group totals by category
  const totalByCategoria = despesasFiltradas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + (d.valor || 0);
    return acc;
  }, {} as Record<string, number>);

  // ===== Resumo financeiro completo do evento =====
  const totalInscritos = inscricoes.length;
  const totalPrevisao = inscricoes.reduce((s: number, i: any) => s + (Number(i.valor_inscricao) || 0), 0);
  const totalPago = inscricoes.reduce((s: number, i: any) => s + (Number(i.valor_pago) || 0), 0);
  const totalAReceber = inscricoes.reduce((s: number, i: any) => {
    const status = String(i.status_pagamento || "").toLowerCase();
    if (status === "cancelado") return s;
    const diff = (Number(i.valor_inscricao) || 0) - (Number(i.valor_pago) || 0);
    return s + (diff > 0 ? diff : 0);
  }, 0);
  const saldoEvento = totalPago - totalDespesas;

  // Quebra por forma de pagamento (considera pagamentos mistos)
  const totalByFormaPgto = inscricoes.reduce((acc: Record<string, number>, i: any) => {
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
  }, {} as Record<string, number>);

  const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
    pix: "PIX",
    dinheiro: "Dinheiro",
    cartao_credito: "Cartão Crédito",
    cartao_debito: "Cartão Débito",
    transferencia: "Transferência",
    boleto: "Boleto",
    vale: "Vale",
  };

  const exportColumns: import("@/lib/export").ExportColumn[] = [
    { header: "Categoria", accessor: (row: any) => row.categoria },
    { header: "Descrição", accessor: (row: any) => row.descricao || "—" },
    { header: "Data", accessor: (row: any) => row.data_despesa ? format(parseLocalDate(row.data_despesa), "dd/MM/yyyy") : "—" },
    { header: "Valor", accessor: (row: any) => row.valor || 0, format: (v: any) => formatCurrency(Number(v) || 0), type: "currency" as const },
  ];

  const handleExportExcel = async () => {
    if (!despesasFiltradas.length) return;
    await exportGenericToExcel(despesasFiltradas, exportColumns, `Despesas_${eventoNome}`, "Despesas");
  };

  const handleExportPDF = () => {
    if (!despesasFiltradas.length) return;

    const doc = new jsPDF({ orientation: "portrait" });

    doc.setFontSize(16);
    doc.text(`Relatório Financeiro — ${eventoNome}`, 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 25);

    // ===== Bloco 1: Resumo Geral =====
    let yPos = 32;
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.setFont(undefined, "bold");
    doc.text("Resumo Geral do Evento", 14, yPos);
    doc.setFont(undefined, "normal");
    yPos += 6;

    doc.setFontSize(9);
    doc.setTextColor(60);
    const resumoLinhas: Array<[string, string]> = [
      ["Inscrições", String(totalInscritos)],
      ["Total Previsto (Entradas)", formatCurrency(totalPrevisao)],
      ["Total Recebido", formatCurrency(totalPago)],
      ["A Receber", formatCurrency(totalAReceber)],
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

    // ===== Bloco 2: Entradas por forma de pagamento =====
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

    // ===== Bloco 3: Saídas por categoria =====
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

    // Título do detalhamento
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.setFont(undefined, "bold");
    doc.text("Detalhamento das Despesas", 14, yPos);
    doc.setFont(undefined, "normal");
    yPos += 3;

    // Table
    const tableHeaders = exportColumns.map((c) => c.header);
    const tableData = despesasFiltradas.map((row) =>
      exportColumns.map((col) => {
        const value = typeof col.accessor === "function" ? col.accessor(row) : "";
        if (col.type === "currency") return formatCurrency(Number(value) || 0);
        if (col.format) return col.format(value);
        return value ?? "—";
      })
    );

    // Total row
    tableData.push(["TOTAL", "", "", formatCurrency(totalDespesas)]);

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
        if (hookData.row.index === tableData.length - 1) {
          hookData.cell.styles.fillColor = [230, 230, 230];
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });

    // Rodapé com saldo final destacado
    const finalY = (doc as any).lastAutoTable?.finalY || yPos;
    let footerY = finalY + 8;
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
    doc.text(`(Total Recebido ${formatCurrency(totalPago)}  -  Total de Despesas ${formatCurrency(totalDespesas)})`, 14, footerY + 5);

    savePDF(doc, `RelatorioFinanceiro_${eventoNome}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Total de despesas: <span className="font-semibold text-foreground">{formatCurrency(totalDespesas)}</span>
        </div>
        <div className="flex gap-2">
          {despesas.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" /> PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Despesa
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : despesas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma despesa registrada para este evento.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnFilterPopover title="Categoria" options={categoriaOptions} selected={filtroCategoria} onChange={setFiltroCategoria} />
                </TableHead>
                <TableHead>
                  <ColumnFilterPopover title="Descrição" options={descricaoOptions} selected={filtroDescricao} onChange={setFiltroDescricao} />
                </TableHead>
                <TableHead>
                  <ColumnFilterPopover title="Data" options={dataOptions} selected={filtroData} onChange={setFiltroData} />
                </TableHead>
                <TableHead className="text-right">
                  <ColumnFilterPopover title="Valor" options={valorOptions} selected={filtroValor} onChange={setFiltroValor} />
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasFiltradas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge variant="outline">{d.categoria}</Badge>
                  </TableCell>
                  <TableCell>{d.descricao || "—"}</TableCell>
                  <TableCell>{d.data_despesa ? format(parseLocalDate(d.data_despesa), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {formatCurrency(d.valor || 0)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(totalDespesas)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Detalhes da despesa..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data_despesa}
                  onChange={(e) => setForm({ ...form, data_despesa: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.categoria || !form.valor || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImpactoDespesasTab;
