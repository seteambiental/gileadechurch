import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDateBR } from "@/lib/masks";
import { ExportButton } from "@/components/ui/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DollarSign, Check, Clock, Plus, Users, ChevronDown, ChevronRight, Trash2, Loader2, Filter, TrendingUp, Scale, ArrowDownCircle, Pencil,
} from "lucide-react";
import { Lock, RotateCcw, Archive, ArchiveRestore } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CasaisDespesasTab from "./CasaisDespesasTab";
import { todayDateStr } from "@/lib/date-utils";

const VALOR_CURSO_DEFAULT = 140;

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
];

const FORMAS_LABELS: Record<string, string> = Object.fromEntries(FORMAS_PAGAMENTO.map(f => [f.value, f.label]));

export function CasaisFinanceiroTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPagamentoCasalId, setAddPagamentoCasalId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "pagamento"; id: string } | null>(null);
  const [editingPagamento, setEditingPagamento] = useState<any>(null);

  // Payment form
  const [pgtoData, setPgtoData] = useState(todayDateStr());
  const [pgtoForma, setPgtoForma] = useState("");
  const [pgtoValor, setPgtoValor] = useState("");

  // Fetch approved couples
  const { data: casais = [], isLoading } = useQuery({
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
        .select("id, nome, ativo, arquivada, valor_curso")
        .order("nome");
      return (data || []) as any[];
    },
  });

  const turmasAtivasVisiveis = useMemo(() => turmas.filter((t: any) => !t.arquivada), [turmas]);
  const turmasArquivadas = useMemo(() => turmas.filter((t: any) => t.arquivada), [turmas]);

  // Fetch all payments
  const { data: pagamentos = [] } = useQuery({
    queryKey: ["casais_pagamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("casais_pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false });
      return (data || []) as any[];
    },
  });

  const pagamentosByCasal = useMemo(() => {
    return pagamentos.reduce((acc: Record<string, any[]>, p: any) => {
      if (!acc[p.casal_id]) acc[p.casal_id] = [];
      acc[p.casal_id].push(p);
      return acc;
    }, {});
  }, [pagamentos]);

  const [filterStatusFin, setFilterStatusFin] = useState<Set<string>>(new Set());

  const valorByTurma = useMemo(() => {
    const map: Record<string, number> = {};
    turmas.forEach((t: any) => {
      map[t.id] = Number(t.valor_curso ?? VALOR_CURSO_DEFAULT);
    });
    return map;
  }, [turmas]);

  const getValorCurso = (casalId: string) => {
    const casal = casais.find((c: any) => c.id === casalId);
    const tid = casal?.turma_id;
    return (tid && valorByTurma[tid]) || VALOR_CURSO_DEFAULT;
  };

  const getFinStatus = (casalId: string) => {
    const pgtos = pagamentosByCasal[casalId] || [];
    const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const valor = getValorCurso(casalId);
    if (pago >= valor) return "Quitado";
    if (pago > 0) return "Parcial";
    return "Pendente";
  };

  const finStatusOptions = useMemo(() => ["Pendente", "Parcial", "Quitado"], []);

  // Filter
  const filtered = useMemo(() => {
    return casais.filter((c: any) => {
      const nome = `${c.nome_masculino || ""} ${c.nome_feminino || ""}`.toLowerCase();
      if (search && !nome.includes(search.toLowerCase())) return false;
      if (turmaFilter !== "todas" && c.turma_id !== turmaFilter) return false;
      if (filterStatusFin.size > 0 && filterStatusFin.size < finStatusOptions.length && !filterStatusFin.has(getFinStatus(c.id))) return false;
      return true;
    });
  }, [casais, search, turmaFilter, filterStatusFin, pagamentosByCasal, finStatusOptions]);

  // Stats
  const stats = useMemo(() => {
    const totalCasais = filtered.length;
    let totalDevido = 0;
    let totalPago = 0;
    let quitados = 0;
    let parciais = 0;
    let pendentes = 0;
    filtered.forEach((c: any) => {
      const pgtos = pagamentosByCasal[c.id] || [];
      const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
      const valor = (c.turma_id && valorByTurma[c.turma_id]) || VALOR_CURSO_DEFAULT;
      totalDevido += valor;
      totalPago += pago;
      if (pago >= valor) quitados++;
      else if (pago > 0) parciais++;
      else pendentes++;
    });
    return { totalCasais, totalDevido, totalPago, totalSaldo: totalDevido - totalPago, quitados, parciais, pendentes };
  }, [filtered, pagamentosByCasal, valorByTurma]);

  // Payment method breakdown
  const totalByPaymentMethod = useMemo(() => {
    const filteredIds = new Set(filtered.map((c: any) => c.id));
    const filteredPgtos = pagamentos.filter((p: any) => filteredIds.has(p.casal_id));
    return filteredPgtos.reduce((acc: Record<string, number>, p: any) => {
      const forma = p.forma_pagamento || "outros";
      acc[forma] = (acc[forma] || 0) + Number(p.valor || 0);
      return acc;
    }, {});
  }, [filtered, pagamentos]);

  // Fetch despesas
  const { data: casaisDespesas = [] } = useQuery({
    queryKey: ["casais-despesas-summary", turmaFilter],
    queryFn: async () => {
      let q = supabase.from("casais_despesas").select("valor,turma_id");
      if (turmaFilter !== "todas") q = q.eq("turma_id", turmaFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
  const totalDespesas = casaisDespesas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
  const saldoGeral = stats.totalPago - totalDespesas;

  // Add payment mutation
  const addPagamentoMutation = useMutation({
    mutationFn: async () => {
      if (!addPagamentoCasalId) return;
      const payload = {
        data_pagamento: pgtoData,
        forma_pagamento: pgtoForma,
        valor: parseFloat(pgtoValor) || 0,
      };
      if (editingPagamento) {
        const { error } = await supabase.from("casais_pagamentos").update(payload).eq("id", editingPagamento.id);
        if (error) throw error;
      } else {
        const casal = casais.find((c: any) => c.id === addPagamentoCasalId);
        let memberId: string | null = null;
        if (user?.id) {
          const { data: memberData } = await supabase
            .from("members")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          memberId = memberData?.id || null;
        }
        const { error } = await supabase.from("casais_pagamentos").insert({
          ...payload,
          casal_id: addPagamentoCasalId,
          turma_id: casal?.turma_id || null,
          status: "pago",
          registrado_por: memberId,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
      toast({ title: editingPagamento ? "Pagamento atualizado" : "Pagamento registrado" });
      setAddPagamentoCasalId(null);
      setEditingPagamento(null);
      setPgtoData(todayDateStr());
      setPgtoForma("");
      setPgtoValor("");
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar pagamento", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.from("casais_pagamentos").delete().eq("id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
      toast({ title: "Pagamento excluído" });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  // Encerrar / reativar turma
  const selectedTurma = turmas.find((t: any) => t.id === turmaFilter);
  const [confirmToggleTurma, setConfirmToggleTurma] = useState(false);
  const toggleTurmaMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTurma) return;
      const { error } = await supabase
        .from("casais_turmas")
        .update({ ativo: !selectedTurma.ativo })
        .eq("id", selectedTurma.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais_financeiro_turmas"] });
      queryClient.invalidateQueries({ queryKey: ["casais_turmas"] });
      toast({ title: selectedTurma?.ativo ? "Turma encerrada" : "Turma reativada" });
      setConfirmToggleTurma(false);
    },
    onError: (e: any) => {
      toast({ title: "Erro ao atualizar turma", description: e.message, variant: "destructive" });
    },
  });

  const [archiveTarget, setArchiveTarget] = useState<{ turma: any; arquivar: boolean } | null>(null);
  const archiveMutation = useMutation({
    mutationFn: async ({ turma, arquivar }: { turma: any; arquivar: boolean }) => {
      const { error } = await supabase
        .from("casais_turmas")
        .update({ arquivada: arquivar })
        .eq("id", turma.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["casais_financeiro_turmas"] });
      queryClient.invalidateQueries({ queryKey: ["casais_turmas"] });
      toast({ title: vars.arquivar ? "Turma arquivada" : "Turma desarquivada" });
      if (vars.arquivar && turmaFilter === vars.turma.id) setTurmaFilter("todas");
      setArchiveTarget(null);
    },
    onError: (e: any) => {
      toast({ title: "Erro ao arquivar turma", description: e.message, variant: "destructive" });
    },
  });

  // Export
  const exportData = filtered.map((c: any) => {
    const pgtos = pagamentosByCasal[c.id] || [];
    const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const valor = (c.turma_id && valorByTurma[c.turma_id]) || VALOR_CURSO_DEFAULT;
    const saldo = valor - pago;
    return {
      esposo: c.nome_masculino || "",
      esposa: c.nome_feminino || "",
      turma: (c.turma as any)?.nome || "—",
      valorTotal: valor,
      pago,
      saldo,
      status: saldo <= 0 ? "Quitado" : pago > 0 ? "Parcial" : "Pendente",
    };
  });

  const exportColumns = [
    { header: "Esposo", accessor: "esposo" },
    { header: "Esposa", accessor: "esposa" },
    { header: "Turma", accessor: "turma" },
    { header: "Valor Total", accessor: "valorTotal", type: "currency" as const },
    { header: "Pago", accessor: "pago", type: "currency" as const },
    { header: "Saldo", accessor: "saldo", type: "currency" as const },
    { header: "Status", accessor: "status" },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard cards - matching Impacto style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inscrições</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCasais}</div>
            <p className="text-xs text-muted-foreground mt-1">Casais aprovados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Previsão de Valores</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDevido)}</div>
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
            {Object.keys(totalByPaymentMethod).length > 0 ? (
              <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                {Object.entries(totalByPaymentMethod)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([method, value]) => (
                    <div key={method} className="flex justify-between">
                      <span>{FORMAS_LABELS[method] || method}</span>
                      <span className="font-medium text-foreground">{formatCurrency(value as number)}</span>
                    </div>
                  ))}
                <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-foreground">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(stats.totalPago)}</span>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPago)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats.quitados} pagos, {stats.parciais} parciais, {stats.pendentes} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor a Receber</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalSaldo)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendentes} pendentes
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
            <p className="text-xs text-muted-foreground">Soma dos custos do curso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Geral</CardTitle>
            <Scale className={`w-4 h-4 ${saldoGeral >= 0 ? "text-green-600" : "text-destructive"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoGeral >= 0 ? "text-green-600" : "text-destructive"}`}>
              {formatCurrency(saldoGeral)}
            </div>
            <p className="text-xs text-muted-foreground">Receitas pagas − Despesas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receitas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="receitas" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Receitas
          </TabsTrigger>
          <TabsTrigger value="despesas" className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4" />
            Despesas
          </TabsTrigger>
          <TabsTrigger value="arquivados" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Arquivados
            {turmasArquivadas.length > 0 && (
              <Badge variant="secondary" className="ml-1">{turmasArquivadas.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receitas" className="space-y-6">

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
          <SearchInput
            placeholder="Buscar casal..."
            value={search}
            onChange={setSearch}
            className="w-full sm:w-64"
          />
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmasAtivasVisiveis.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}{!t.ativo ? " (encerrada)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTurma && (
            <div className="flex gap-2">
              <Button
                variant={selectedTurma.ativo ? "outline" : "secondary"}
                size="sm"
                onClick={() => setConfirmToggleTurma(true)}
              >
                {selectedTurma.ativo ? (
                  <><Lock className="w-4 h-4 mr-2" /> Encerrar</>
                ) : (
                  <><RotateCcw className="w-4 h-4 mr-2" /> Reativar</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchiveTarget({ turma: selectedTurma, arquivar: true })}
              >
                <Archive className="w-4 h-4 mr-2" /> Arquivar
              </Button>
            </div>
          )}
        </div>
        <ExportButton data={exportData} columns={exportColumns} filename="casais-financeiro" title="Financeiro - Curso de Casais" sheetName="Casais" />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Esposo</TableHead>
              <TableHead>Esposa</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>
                <ColumnFilterPopover title="Status" options={finStatusOptions} selected={filterStatusFin} onChange={setFilterStatusFin} />
              </TableHead>
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
              filtered.map((casal: any) => {
                const pgtos = pagamentosByCasal[casal.id] || [];
                const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
                const saldo = VALOR_CURSO - pago;
                const isExpanded = expandedId === casal.id;

                return (
                  <>
                    <TableRow
                      key={casal.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedId(isExpanded ? null : casal.id)}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{casal.nome_masculino}</TableCell>
                      <TableCell>{casal.nome_feminino}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{(casal.turma as any)?.nome || "—"}</TableCell>
                      <TableCell>{formatCurrency(VALOR_CURSO)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(pago)}</TableCell>
                      <TableCell className={saldo > 0 ? "text-destructive" : "text-green-600"}>
                        {formatCurrency(saldo)}
                      </TableCell>
                      <TableCell>
                        {saldo <= 0 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Quitado</Badge>
                        ) : pago > 0 ? (
                          <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">Parcial</Badge>
                        ) : (
                          <Badge variant="destructive">Pendente</Badge>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow key={`${casal.id}-detail`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm">Pagamentos</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddPagamentoCasalId(casal.id);
                                  setPgtoData(todayDateStr());
                                  setPgtoForma("");
                                  const restante = VALOR_CURSO - pago;
                                  setPgtoValor(restante > 0 ? restante.toString() : "");
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Registrar Pagamento
                              </Button>
                            </div>

                            {pgtos.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Nenhum pagamento registrado</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Forma</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Observações</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pgtos.map((p: any) => (
                                    <TableRow key={p.id}>
                                      <TableCell>{formatDateBR(p.data_pagamento)}</TableCell>
                                      <TableCell>{FORMAS_LABELS[p.forma_pagamento] || p.forma_pagamento || "—"}</TableCell>
                                      <TableCell className="text-green-600 font-medium">{formatCurrency(Number(p.valor))}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{p.observacoes || "—"}</TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingPagamento(p);
                                                setAddPagamentoCasalId(casal.id);
                                                setPgtoData(p.data_pagamento || todayDateStr());
                                                setPgtoForma(p.forma_pagamento || "");
                                                setPgtoValor(String(p.valor || ""));
                                              }}
                                            >
                                              <Pencil className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteTarget({ type: "pagamento", id: p.id });
                                              }}
                                            >
                                              <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add payment dialog */}
      <Dialog open={!!addPagamentoCasalId} onOpenChange={(open) => { if (!open) { setAddPagamentoCasalId(null); setEditingPagamento(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPagamento ? "Editar Pagamento" : "Registrar Pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <DateInput value={pgtoData} onChange={setPgtoData} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={pgtoValor} onChange={(e) => setPgtoValor(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={pgtoForma} onValueChange={setPgtoForma}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddPagamentoCasalId(null); setEditingPagamento(null); }}>Cancelar</Button>
            <Button
              onClick={() => addPagamentoMutation.mutate()}
              disabled={addPagamentoMutation.isPending || !pgtoForma || !pgtoValor}
            >
              {addPagamentoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingPagamento ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Pagamento"
        description="Tem certeza que deseja excluir este pagamento?"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
        </TabsContent>

        <TabsContent value="despesas">
          <CasaisDespesasTab turmaId={turmaFilter === "todas" ? null : turmaFilter} turmas={turmas} />
        </TabsContent>

        <TabsContent value="arquivados" className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turmasArquivadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhuma turma arquivada
                    </TableCell>
                  </TableRow>
                ) : (
                  turmasArquivadas.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.ativo ? "Ativa" : "Encerrada"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setArchiveTarget({ turma: t, arquivar: false })}>
                            <ArchiveRestore className="w-4 h-4 mr-1" /> Desarquivar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Turmas arquivadas ficam ocultas dos filtros principais. Desarquive para visualizar o histórico financeiro novamente.
          </p>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={confirmToggleTurma}
        onOpenChange={setConfirmToggleTurma}
        title={selectedTurma?.ativo ? "Encerrar turma" : "Reativar turma"}
        description={
          selectedTurma?.ativo
            ? `Deseja encerrar a turma "${selectedTurma?.nome}"? Ela deixará de receber novas inscrições, mas o histórico financeiro permanece acessível.`
            : `Deseja reativar a turma "${selectedTurma?.nome}"?`
        }
        onConfirm={() => toggleTurmaMutation.mutate()}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={archiveTarget?.arquivar ? "Arquivar turma" : "Desarquivar turma"}
        description={
          archiveTarget?.arquivar
            ? `Arquivar "${archiveTarget?.turma?.nome}"? Ela sairá dos filtros principais e ficará acessível apenas na aba "Arquivados".`
            : `Desarquivar "${archiveTarget?.turma?.nome}"? Ela voltará a aparecer nos filtros principais.`
        }
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
      />
    </div>
  );
}
