import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate, todayDateStr } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/masks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportGenericToExcel, savePDF, ExportColumn } from "@/lib/export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";

const CATEGORIAS_DESPESA = [
  "Material Didático",
  "Impressos",
  "Alimentação",
  "Transporte",
  "Equipamentos",
  "Infraestrutura",
  "Certificados",
  "Decoração",
  "Outros",
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

interface CasaisDespesasTabProps {
  turmaId?: string | null;
  turmas?: { id: string; nome: string; ativo?: boolean }[];
}

const CasaisDespesasTab = ({ turmaId = null, turmas = [] }: CasaisDespesasTabProps) => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DespesaForm>(emptyForm);
  const [filterCategoria, setFilterCategoria] = useState<Set<string>>(new Set());

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ["casais-despesas", turmaId],
    queryFn: async () => {
      let q = supabase.from("casais_despesas").select("*").order("categoria");
      if (turmaId) q = q.eq("turma_id", turmaId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        categoria: form.categoria,
        descricao: form.descricao || null,
        valor: parseFloat(form.valor) || 0,
        data_despesa: form.data_despesa,
        turma_id: turmaId,
      };
      if (editingId) {
        const { error } = await supabase.from("casais_despesas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("casais_despesas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais-despesas"] });
      queryClient.invalidateQueries({ queryKey: ["casais-despesas-summary"] });
      toast.success(editingId ? "Despesa atualizada!" : "Despesa adicionada!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar despesa."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("casais_despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais-despesas"] });
      queryClient.invalidateQueries({ queryKey: ["casais-despesas-summary"] });
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

  const columnOptions = useMemo(() => {
    return { categorias: [...new Set(despesas.map((d) => d.categoria))].sort() };
  }, [despesas]);

  const filteredDespesas = useMemo(() => {
    return despesas.filter((d) => {
      if (filterCategoria.size > 0 && filterCategoria.size < columnOptions.categorias.length && !filterCategoria.has(d.categoria)) return false;
      return true;
    });
  }, [despesas, filterCategoria, columnOptions]);

  const totalDespesas = filteredDespesas.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

  const totalByCategoria = filteredDespesas.reduce((acc, d) => {
    acc[d.categoria] = (acc[d.categoria] || 0) + (Number(d.valor) || 0);
    return acc;
  }, {} as Record<string, number>);

  const exportColumns: ExportColumn[] = [
    { header: "Categoria", accessor: (row: any) => row.categoria },
    { header: "Descrição", accessor: (row: any) => row.descricao || "—" },
    { header: "Data", accessor: (row: any) => row.data_despesa ? format(parseLocalDate(row.data_despesa), "dd/MM/yyyy") : "—" },
    { header: "Valor", accessor: (row: any) => row.valor || 0, format: (v: any) => formatCurrency(Number(v) || 0), type: "currency" as const },
  ];

  const handleExportExcel = async () => {
    if (!despesas.length) return;
    await exportGenericToExcel(despesas, exportColumns, "Despesas_Casais", "Despesas");
  };

  const handleExportPDF = () => {
    if (!despesas.length) return;
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setFontSize(16);
    doc.text("Despesas — Curso de Casais", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 25);

    let yPos = 34;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Total de Despesas: ${formatCurrency(totalDespesas)}`, 14, yPos);
    yPos += 6;

    const categoriasOrdenadas = Object.entries(totalByCategoria).sort(([, a], [, b]) => b - a);
    if (categoriasOrdenadas.length > 0) {
      doc.setFontSize(9);
      categoriasOrdenadas.forEach(([cat, val]) => {
        doc.text(`  ${cat}: ${formatCurrency(val)}`, 14, yPos);
        yPos += 5;
      });
      yPos += 2;
    }

    const tableHeaders = exportColumns.map((c) => c.header);
    const tableData = despesas.map((row) =>
      exportColumns.map((col) => {
        const value = typeof col.accessor === "function" ? col.accessor(row) : "";
        if (col.type === "currency") return formatCurrency(Number(value) || 0);
        if (col.format) return col.format(value);
        return value ?? "—";
      })
    );
    tableData.push(["TOTAL", "", "", formatCurrency(totalDespesas)]);

    autoTable(doc, {
      head: [tableHeaders],
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

    savePDF(doc, "Despesas_Casais.pdf");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {turmaId
            ? <>Despesas da turma <span className="font-semibold text-foreground">{turmas.find(t => t.id === turmaId)?.nome || ""}</span> · Total: <span className="font-semibold text-foreground">{formatCurrency(totalDespesas)}</span></>
            : <>Todas as turmas · Total: <span className="font-semibold text-foreground">{formatCurrency(totalDespesas)}</span></>
          }
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
            Nenhuma despesa registrada para o Curso de Casais.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
              <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnFilterPopover title="Categoria" options={columnOptions.categorias} selected={filterCategoria} onChange={setFilterCategoria} />
                </TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDespesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                  <TableCell>{d.descricao || "—"}</TableCell>
                  <TableCell>{d.data_despesa ? format(parseLocalDate(d.data_despesa), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{formatCurrency(Number(d.valor) || 0)}</TableCell>
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
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
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

export default CasaisDespesasTab;
