import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayDateStr, parseLocalDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/masks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ColumnFilter } from "./ColumnFilter";

const CATEGORIAS = [
  "Envio para Moçambique",
  "Material",
  "Transporte",
  "Alimentação",
  "Tarifas Bancárias",
  "Comunicação",
  "Equipamentos",
  "Outros",
];
const FORMAS = ["Dinheiro", "PIX", "Transferência", "Cartão", "Outro"];

interface Props { mesRef: string; cotacao: number }

export function MissoesDespesasTab({ mesRef, cotacao }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyFiltros = { categoria: [] as string[], descricao: [] as string[], data: [] as string[], forma: [] as string[], valor: [] as string[] };
  const [filtros, setFiltros] = useState(emptyFiltros);
  const [form, setForm] = useState({
    categoria: "",
    descricao: "",
    valor: "",
    data_despesa: todayDateStr(),
    forma_pagamento: "PIX",
    observacoes: "",
  });

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ["mm-despesas", mesRef],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_despesas")
        .select("*")
        .eq("mes_referencia", mesRef)
        .order("data_despesa", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const reset = () => {
    setEditingId(null);
    setForm({ categoria: "", descricao: "", valor: "", data_despesa: todayDateStr(), forma_pagamento: "PIX", observacoes: "" });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        categoria: form.categoria,
        descricao: form.descricao || null,
        valor: parseFloat(form.valor) || 0,
        data_despesa: form.data_despesa,
        mes_referencia: mesRef,
        forma_pagamento: form.forma_pagamento,
        observacoes: form.observacoes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("missoes_mocambique_despesas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("missoes_mocambique_despesas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm-despesas"] });
      toast.success(editingId ? "Despesa atualizada!" : "Despesa adicionada!");
      setOpen(false);
      reset();
    },
    onError: () => toast.error("Erro ao salvar."),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missoes_mocambique_despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mm-despesas"] });
      toast.success("Despesa removida.");
    },
  });

  const rowValues = (d: any) => ({
    categoria: String(d.categoria || ""),
    descricao: String(d.descricao || ""),
    data: format(parseLocalDate(d.data_despesa), "dd/MM/yyyy"),
    forma: String(d.forma_pagamento || ""),
    valor: formatCurrency(Number(d.valor || 0)),
  });
  const match = (sel: string[], v: string) => sel.length === 0 || sel.includes(v);
  const despesasFiltradas = (despesas as any[]).filter((d) => {
    const v = rowValues(d);
    return match(filtros.categoria, v.categoria)
      && match(filtros.descricao, v.descricao)
      && match(filtros.data, v.data)
      && match(filtros.forma, v.forma)
      && match(filtros.valor, v.valor);
  });
  const opcoes = {
    categoria: (despesas as any[]).map((d) => rowValues(d).categoria),
    descricao: (despesas as any[]).map((d) => rowValues(d).descricao),
    data: (despesas as any[]).map((d) => rowValues(d).data),
    forma: (despesas as any[]).map((d) => rowValues(d).forma),
    valor: (despesas as any[]).map((d) => rowValues(d).valor),
  };
  const total = despesasFiltradas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
  const algumFiltro = Object.values(filtros).some((arr) => arr.length > 0);

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      categoria: d.categoria,
      descricao: d.descricao || "",
      valor: String(d.valor || ""),
      data_despesa: d.data_despesa,
      forma_pagamento: d.forma_pagamento || "PIX",
      observacoes: d.observacoes || "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Total do mês: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
          {cotacao > 0 && <span className="ml-2 text-xs">(MZN {(total * cotacao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})</span>}
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Despesa
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><ColumnFilter label="Categoria" options={opcoes.categoria} selected={filtros.categoria} onChange={(v) => setFiltros({ ...filtros, categoria: v })} /></TableHead>
                <TableHead><ColumnFilter label="Descrição" options={opcoes.descricao} selected={filtros.descricao} onChange={(v) => setFiltros({ ...filtros, descricao: v })} /></TableHead>
                <TableHead><ColumnFilter label="Data" options={opcoes.data} selected={filtros.data} onChange={(v) => setFiltros({ ...filtros, data: v })} /></TableHead>
                <TableHead><ColumnFilter label="Forma" options={opcoes.forma} selected={filtros.forma} onChange={(v) => setFiltros({ ...filtros, forma: v })} /></TableHead>
                <TableHead className="text-right"><ColumnFilter label="Valor" options={opcoes.valor} selected={filtros.valor} onChange={(v) => setFiltros({ ...filtros, valor: v })} align="end" className="justify-end" /></TableHead>
                <TableHead className="w-[80px] text-right">
                  {algumFiltro && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFiltros(emptyFiltros)} aria-label="Limpar filtros">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-6">Carregando...</TableCell></TableRow>
              ) : despesasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{algumFiltro ? "Nenhuma despesa para os filtros aplicados." : "Nenhuma despesa neste mês."}</TableCell></TableRow>
              ) : despesasFiltradas.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                  <TableCell>{d.descricao || "—"}</TableCell>
                  <TableCell>{format(parseLocalDate(d.data_despesa), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{d.forma_pagamento || "—"}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{formatCurrency(Number(d.valor || 0))}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {despesasFiltradas.length > 0 && (
                <TableRow className="font-semibold">
                  <TableCell colSpan={4}>Total</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(total)}</TableCell>
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data_despesa} onChange={(e) => setForm({ ...form, data_despesa: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FORMAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={!form.categoria || !form.valor || save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}