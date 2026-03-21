import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { DollarSign, Check, Clock, Plus, Search, TrendingUp, Users } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

const STATUS_COLORS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  atrasado: "bg-red-100 text-red-800",
  sem_registro: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  sem_registro: "Sem registro",
};

const VALOR_CASAL = 100;

export function CasaisFinanceiroTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCasalId, setSelectedCasalId] = useState("");
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState("todas");
  const [mesRef, setMesRef] = useState("");
  const [valor, setValor] = useState(VALOR_CASAL.toString());
  const [status, setStatus] = useState("pendente");
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [filterStatus, setFilterStatus] = useState<Set<string>>(new Set());
  const [filterTurma, setFilterTurma] = useState<Set<string>>(new Set());
  const [selectedMesFilter, setSelectedMesFilter] = useState("");

  // Fetch all approved casais
  const { data: casais = [] } = useQuery({
    queryKey: ["casais_financeiro_casais"],
    queryFn: async () => {
      const { data } = await supabase
        .from("casais_inscritos")
        .select("id, nome_masculino, nome_feminino, turma_id, turma:casais_turmas(id, nome)")
        .eq("status", "aprovado")
        .order("nome_masculino");
      return (data || []) as any[];
    },
  });

  // Fetch turmas
  const { data: turmas = [] } = useQuery({
    queryKey: ["casais_financeiro_turmas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("casais_turmas")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return (data || []) as any[];
    },
  });

  // Fetch all payments
  const { data: pagamentos = [] } = useQuery({
    queryKey: ["casais_pagamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("casais_pagamentos")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Build merged list: each casal with their latest payment info for the selected month
  const mergedList = useMemo(() => {
    return casais.map((casal: any) => {
      const casalPagamentos = pagamentos.filter((p: any) => p.casal_id === casal.id);
      
      // If month filter is active, find payment for that month
      let pagamento = null;
      if (selectedMesFilter) {
        pagamento = casalPagamentos.find((p: any) => p.mes_referencia === selectedMesFilter) || null;
      } else {
        // Show latest payment
        pagamento = casalPagamentos[0] || null;
      }

      return {
        ...casal,
        pagamento,
        statusFinanceiro: pagamento?.status || "sem_registro",
        turma_nome: (casal.turma as any)?.nome || "Sem turma",
      };
    });
  }, [casais, pagamentos, selectedMesFilter]);

  // Apply filters
  const filtered = useMemo(() => {
    return mergedList.filter((item: any) => {
      const nome = `${item.nome_masculino || ""} ${item.nome_feminino || ""}`.toLowerCase();
      if (search && !nome.includes(search.toLowerCase())) return false;
      if (filterStatus.size > 0 && !filterStatus.has(item.statusFinanceiro)) return false;
      if (filterTurma.size > 0 && !filterTurma.has(item.turma_nome)) return false;
      if (selectedTurmaFilter !== "todas" && item.turma_id !== selectedTurmaFilter) return false;
      return true;
    });
  }, [mergedList, search, filterStatus, filterTurma, selectedTurmaFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalCasais = filtered.length;
    const totalEsperado = totalCasais * VALOR_CASAL;
    const pagos = filtered.filter((i: any) => i.statusFinanceiro === "pago");
    const totalPago = pagos.reduce((acc: number, i: any) => acc + Number(i.pagamento?.valor || 0), 0);
    const pendentes = filtered.filter((i: any) => i.statusFinanceiro === "pendente" || i.statusFinanceiro === "atrasado");
    const totalPendente = pendentes.reduce((acc: number, i: any) => acc + Number(i.pagamento?.valor || 0), 0);
    const semRegistro = filtered.filter((i: any) => i.statusFinanceiro === "sem_registro").length;
    return { totalCasais, totalEsperado, totalPago, totalPendente, qtdPagos: pagos.length, semRegistro };
  }, [filtered]);

  const handleSave = async () => {
    if (!selectedCasalId || !mesRef) {
      toast({ title: "Selecione o casal e o mês de referência", variant: "destructive" });
      return;
    }
    const casal = casais.find((c: any) => c.id === selectedCasalId);
    const { error } = await supabase.from("casais_pagamentos").insert({
      casal_id: selectedCasalId,
      turma_id: casal?.turma_id || null,
      mes_referencia: mesRef,
      valor: Number(valor) || VALOR_CASAL,
      status,
      data_pagamento: dataPagamento || null,
      observacoes: observacoes || null,
    });
    if (error) {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    } else {
      toast({ title: "Pagamento registrado!" });
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
      setFormOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedCasalId("");
    setMesRef("");
    setValor(VALOR_CASAL.toString());
    setStatus("pendente");
    setDataPagamento("");
    setObservacoes("");
  };

  const handleUpdateStatus = async (pagamentoId: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "pago") {
      const now = new Date();
      update.data_pagamento = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    const { error } = await supabase.from("casais_pagamentos").update(update).eq("id", pagamentoId);
    if (!error) {
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
    }
  };

  const handleQuickRegister = async (casalId: string) => {
    if (!selectedMesFilter) {
      toast({ title: "Selecione um mês de referência para registrar pagamentos rápidos", variant: "destructive" });
      return;
    }
    const casal = casais.find((c: any) => c.id === casalId);
    const { error } = await supabase.from("casais_pagamentos").insert({
      casal_id: casalId,
      turma_id: casal?.turma_id || null,
      mes_referencia: selectedMesFilter,
      valor: VALOR_CASAL,
      status: "pendente",
    });
    if (!error) {
      toast({ title: "Pagamento registrado como pendente" });
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
    }
  };

  // Unique values for filters
  const allStatuses = [...new Set(mergedList.map((i: any) => i.statusFinanceiro))];
  const allTurmaNames = [...new Set(mergedList.map((i: any) => i.turma_nome))];
  const allMeses = [...new Set(pagamentos.map((p: any) => p.mes_referencia).filter(Boolean))].sort().reverse();

  const exportColumns = [
    { header: "Esposo", accessor: (i: any) => i.nome_masculino || "" },
    { header: "Esposa", accessor: (i: any) => i.nome_feminino || "" },
    { header: "Turma", accessor: (i: any) => i.turma_nome },
    { header: "Valor", accessor: (i: any) => i.pagamento ? `R$ ${Number(i.pagamento.valor).toFixed(2)}` : `R$ ${VALOR_CASAL.toFixed(2)}` },
    { header: "Status", accessor: (i: any) => STATUS_LABELS[i.statusFinanceiro] || i.statusFinanceiro },
    { header: "Data Pgto.", accessor: (i: any) => i.pagamento?.data_pagamento || "—" },
    { header: "Mês Ref.", accessor: (i: any) => i.pagamento?.mes_referencia || "—" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Casais</p>
              <p className="font-bold text-lg">{stats.totalCasais}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Esperado</p>
              <p className="font-bold text-lg">R$ {stats.totalEsperado.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="font-bold text-lg text-green-600">R$ {stats.totalPago.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="font-bold text-lg text-yellow-600">
                {stats.totalPendente > 0 ? `R$ ${stats.totalPendente.toFixed(2)}` : `${stats.semRegistro} sem registro`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar casal..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedTurmaFilter} onValueChange={setSelectedTurmaFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas turmas</SelectItem>
              {turmas.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMesFilter || "__all__"} onValueChange={(v) => setSelectedMesFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mês referência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os meses</SelectItem>
              {allMeses.map((m: string) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={filtered} columns={exportColumns} filename="casais-financeiro" title="Financeiro Casais" />
          <Button onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Pagamento
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Esposo</TableHead>
              <TableHead>Esposa</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  title="Turma"
                  options={allTurmaNames}
                  selected={filterTurma}
                  onChange={setFilterTurma}
                />
              </TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  title="Status"
                  options={allStatuses}
                  selected={filterStatus}
                  onChange={setFilterStatus}
                />
              </TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Data Pgto.</TableHead>
              <TableHead className="w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum casal encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item: any) => (
                <TableRow
                  key={item.id}
                  className={
                    item.statusFinanceiro === "pendente" ? "bg-yellow-50/50" :
                    item.statusFinanceiro === "atrasado" ? "bg-red-50/50" :
                    item.statusFinanceiro === "sem_registro" ? "bg-muted/30" : ""
                  }
                >
                  <TableCell className="font-medium">{item.nome_masculino}</TableCell>
                  <TableCell>{item.nome_feminino}</TableCell>
                  <TableCell>{item.turma_nome}</TableCell>
                  <TableCell>
                    {item.pagamento ? `R$ ${Number(item.pagamento.valor).toFixed(2)}` : `R$ ${VALOR_CASAL.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.statusFinanceiro]}`}>
                      {STATUS_LABELS[item.statusFinanceiro]}
                    </span>
                  </TableCell>
                  <TableCell>{item.pagamento?.mes_referencia || "—"}</TableCell>
                  <TableCell>{item.pagamento?.data_pagamento || "—"}</TableCell>
                  <TableCell>
                    {item.pagamento && item.pagamento.status !== "pago" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(item.pagamento.id, "pago")}>
                        Marcar Pago
                      </Button>
                    )}
                    {!item.pagamento && (
                      <Button size="sm" variant="outline" onClick={() => handleQuickRegister(item.id)}>
                        Registrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Payment Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Casal</Label>
              <Select value={selectedCasalId} onValueChange={setSelectedCasalId}>
                <SelectTrigger><SelectValue placeholder="Selecione o casal" /></SelectTrigger>
                <SelectContent>
                  {casais.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_masculino} e {c.nome_feminino}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mês Referência</Label>
                <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Pagamento</Label>
                <Input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
