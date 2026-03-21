import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { DollarSign, Check, Clock, Plus, Search, TrendingUp } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

const STATUS_COLORS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  atrasado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
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

  // Fetch casais aprovados
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

  // Fetch pagamentos
  const { data: pagamentos = [] } = useQuery({
    queryKey: ["casais_pagamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("casais_pagamentos")
        .select("*, casais_inscritos(nome_masculino, nome_feminino, turma_id, turma:casais_turmas(nome))")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const filtered = useMemo(() => {
    return pagamentos.filter((p: any) => {
      const casal = p.casais_inscritos;
      const nomeCompleto = `${casal?.nome_masculino || ""} ${casal?.nome_feminino || ""}`.toLowerCase();
      if (search && !nomeCompleto.includes(search.toLowerCase())) return false;
      if (filterStatus.size > 0 && !filterStatus.has(p.status)) return false;
      if (filterTurma.size > 0) {
        const turmaNome = casal?.turma?.nome || "Sem turma";
        if (!filterTurma.has(turmaNome)) return false;
      }
      if (selectedTurmaFilter !== "todas" && casal?.turma_id !== selectedTurmaFilter) return false;
      return true;
    });
  }, [pagamentos, search, filterStatus, filterTurma, selectedTurmaFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.reduce((acc: number, p: any) => acc + Number(p.valor || 0), 0);
    const pagos = filtered.filter((p: any) => p.status === "pago");
    const totalPago = pagos.reduce((acc: number, p: any) => acc + Number(p.valor || 0), 0);
    const totalPendente = filtered
      .filter((p: any) => p.status === "pendente" || p.status === "atrasado")
      .reduce((acc: number, p: any) => acc + Number(p.valor || 0), 0);
    return { total, totalPago, totalPendente, qtdPagos: pagos.length, qtdTotal: filtered.length };
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "pago") {
      const now = new Date();
      update.data_pagamento = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    const { error } = await supabase.from("casais_pagamentos").update(update).eq("id", id);
    if (!error) {
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
    }
  };

  // Unique values for filters
  const allStatuses = [...new Set(pagamentos.map((p: any) => p.status))];
  const allTurmaNames = [...new Set(pagamentos.map((p: any) => p.casais_inscritos?.turma?.nome || "Sem turma"))];

  const exportData = filtered.map((p: any) => ({
    Casal: `${p.casais_inscritos?.nome_masculino || ""} e ${p.casais_inscritos?.nome_feminino || ""}`,
    Turma: p.casais_inscritos?.turma?.nome || "—",
    "Mês Ref.": p.mes_referencia || "—",
    Valor: `R$ ${Number(p.valor).toFixed(2)}`,
    Status: STATUS_LABELS[p.status] || p.status,
    "Data Pgto.": p.data_pagamento || "—",
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-lg">R$ {stats.total.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido</p>
              <p className="font-bold text-lg text-green-700">R$ {stats.totalPago.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="font-bold text-lg text-yellow-700">R$ {stats.totalPendente.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor/Casal</p>
              <p className="font-bold text-lg">R$ {VALOR_CASAL.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full sm:w-72">
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
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={exportData} filename="casais-financeiro" />
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
              <TableHead>Casal</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  title="Turma"
                  options={allTurmaNames}
                  selected={filterTurma}
                  onChange={setFilterTurma}
                />
              </TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>
                <ColumnFilterPopover
                  title="Status"
                  options={allStatuses}
                  selected={filterStatus}
                  onChange={setFilterStatus}
                  labelMap={STATUS_LABELS}
                />
              </TableHead>
              <TableHead>Data Pgto.</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento registrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p: any) => (
                <TableRow key={p.id} className={p.status === "pendente" ? "bg-yellow-50/50" : p.status === "atrasado" ? "bg-red-50/50" : ""}>
                  <TableCell className="font-medium">
                    {p.casais_inscritos?.nome_masculino} e {p.casais_inscritos?.nome_feminino}
                  </TableCell>
                  <TableCell>{p.casais_inscritos?.turma?.nome || "—"}</TableCell>
                  <TableCell>{p.mes_referencia || "—"}</TableCell>
                  <TableCell>R$ {Number(p.valor).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </TableCell>
                  <TableCell>{p.data_pagamento || "—"}</TableCell>
                  <TableCell>
                    {p.status !== "pago" && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p.id, "pago")}>
                        Marcar Pago
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
