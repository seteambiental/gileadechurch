import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS_DESPESA = [
  "Chácara",
  "Decoração",
  "Embalagens",
  "Gás para balões",
  "Impressos",
  "Maquiagem",
  "Ônibus",
  "Supermercado Alimentação",
  "Supermercado Higiene e Limpeza",
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
}

const ImpactoDespesasTab = ({ eventoId }: Props) => {
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

  const totalDespesas = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Total de despesas: <span className="font-semibold text-foreground">{formatCurrency(totalDespesas)}</span>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar Despesa
        </Button>
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
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge variant="outline">{d.categoria}</Badge>
                  </TableCell>
                  <TableCell>{d.descricao || "—"}</TableCell>
                  <TableCell>{format(parseLocalDate(d.data_despesa), "dd/MM/yyyy")}</TableCell>
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
