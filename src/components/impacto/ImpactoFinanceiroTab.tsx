import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DollarSign, Check, Clock, AlertCircle, TrendingUp } from "lucide-react";

const ImpactoFinanceiroTab = () => {
  const queryClient = useQueryClient();
  const [selectedEventoId, setSelectedEventoId] = useState("");
  const [pagamentoDialog, setPagamentoDialog] = useState<{ open: boolean; inscricao: any }>({
    open: false,
    inscricao: null,
  });
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");

  const { data: eventos } = useQuery({
    queryKey: ["impacto-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("*")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: inscricoes, isLoading } = useQuery({
    queryKey: ["impacto-inscricoes-financeiro", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("*")
        .eq("evento_id", selectedEventoId)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEventoId,
  });

  const updatePagamentoMutation = useMutation({
    mutationFn: async ({ id, valor_pago, status_pagamento, forma_pagamento }: any) => {
      const { error } = await supabase
        .from("impacto_inscricoes")
        .update({
          valor_pago,
          status_pagamento,
          forma_pagamento,
          data_pagamento: status_pagamento === "pago" ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento atualizado!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-financeiro", selectedEventoId] });
      setPagamentoDialog({ open: false, inscricao: null });
      setValorPago("");
      setFormaPagamento("");
    },
  });

  const selectedEvento = eventos?.find((e) => e.id === selectedEventoId);
  const valorInscricao = selectedEvento?.valor_inscricao || 0;

  // Calculate totals
  const totalInscritos = inscricoes?.length || 0;
  const totalEsperado = totalInscritos * valorInscricao;
  const totalRecebido = inscricoes?.reduce((sum, i) => sum + (i.valor_pago || 0), 0) || 0;
  const totalPendente = totalEsperado - totalRecebido;
  const inscricoesPagas = inscricoes?.filter((i) => i.status_pagamento === "pago").length || 0;
  const inscricoesPendentes = inscricoes?.filter((i) => i.status_pagamento === "pendente").length || 0;
  const inscricoesParciais = inscricoes?.filter((i) => i.status_pagamento === "parcial").length || 0;

  const handleRegistrarPagamento = (inscricao: any) => {
    setValorPago(inscricao.valor_pago?.toString() || "");
    setFormaPagamento(inscricao.forma_pagamento || "");
    setPagamentoDialog({ open: true, inscricao });
  };

  const handleSalvarPagamento = () => {
    const valor = parseFloat(valorPago) || 0;
    let status = "pendente";
    if (valor >= valorInscricao) {
      status = "pago";
    } else if (valor > 0) {
      status = "parcial";
    }

    updatePagamentoMutation.mutate({
      id: pagamentoDialog.inscricao.id,
      valor_pago: valor,
      status_pagamento: status,
      forma_pagamento: formaPagamento,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Pago</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Financeiro</h2>
        <Select value={selectedEventoId} onValueChange={setSelectedEventoId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione um evento" />
          </SelectTrigger>
          <SelectContent>
            {eventos?.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver o financeiro.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Esperado</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {totalEsperado.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {totalInscritos} inscrições × R$ {valorInscricao.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                <DollarSign className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {inscricoesPagas} pagos completos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
                <Clock className="w-4 h-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">R$ {totalPendente.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {inscricoesPendentes} pendentes, {inscricoesParciais} parciais
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Check className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalInscritos > 0 ? Math.round((inscricoesPagas / totalInscritos) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Inscrições pagas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inscriptions Table */}
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : inscricoes?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma inscrição registrada.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor Inscr.</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscricoes?.map((inscricao) => (
                    <TableRow key={inscricao.id}>
                      <TableCell className="font-medium">{inscricao.nome}</TableCell>
                      <TableCell>R$ {valorInscricao.toFixed(2)}</TableCell>
                      <TableCell>R$ {(inscricao.valor_pago || 0).toFixed(2)}</TableCell>
                      <TableCell>{inscricao.forma_pagamento || "-"}</TableCell>
                      <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRegistrarPagamento(inscricao)}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pagamento
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={pagamentoDialog.open} onOpenChange={(open) => setPagamentoDialog({ open, inscricao: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Participante: <span className="font-medium text-foreground">{pagamentoDialog.inscricao?.nome}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Valor da inscrição: <span className="font-medium text-foreground">R$ {valorInscricao.toFixed(2)}</span>
            </p>
            <div>
              <label className="text-sm font-medium">Valor Pago (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagamentoDialog({ open: false, inscricao: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarPagamento} disabled={updatePagamentoMutation.isPending}>
              {updatePagamentoMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImpactoFinanceiroTab;
