import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateBR } from "@/lib/masks";
import { ExportButton } from "@/components/ui/export-button";
import { ExportColumn } from "@/lib/export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MemberSelect } from "@/components/ui/member-select";
import { DollarSign, Plus, ChevronDown, ChevronRight, Trash2, Loader2, GraduationCap, Clock, BarChart3, Filter, ArrowDownCircle, TrendingUp, Scale, Pencil, RefreshCw } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import TeologiaDespesasTab from "./TeologiaDespesasTab";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { useToast } from "@/hooks/use-toast";
import { todayDateStr } from "@/lib/date-utils";

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
];

const FORMAS_LABELS: Record<string, string> = Object.fromEntries(FORMAS_PAGAMENTO.map(f => [f.value, f.label]));

const TeologiaFinanceiroTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("todas");
  const [colFilterTurma, setColFilterTurma] = useState<Set<string>>(new Set());
  const [colFilterStatus, setColFilterStatus] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addAlunoOpen, setAddAlunoOpen] = useState(false);
  const [addPagamentoAlunoId, setAddPagamentoAlunoId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "aluno" | "pagamento"; id: string } | null>(null);
  const [editingPagamento, setEditingPagamento] = useState<any>(null);

  // Add aluno form
  const [novoMemberId, setNovoMemberId] = useState("");
  const [novoValor, setNovoValor] = useState("");

  // Add pagamento form
  const [pgtoData, setPgtoData] = useState(todayDateStr());
  const [pgtoForma, setPgtoForma] = useState("");
  const [pgtoValor, setPgtoValor] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Auto-sync on mount
  useEffect(() => {
    const doSync = async () => {
      setSyncing(true);
      try {
        const { error } = await supabase.functions.invoke("sync-teologia-alunos");
        if (error) console.error("Sync error:", error);
        else queryClient.invalidateQueries({ queryKey: ["teologia-alunos"] });
      } catch (e) {
        console.error("Sync failed:", e);
      } finally {
        setSyncing(false);
      }
    };
    doSync();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["teologia-alunos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teologia_alunos")
        .select("*, members(full_name)")
        .gt("valor_total", 0)
        .order("nome_aluno", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["teologia-pagamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teologia_pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pagamentosByAluno = pagamentos.reduce((acc, p) => {
    if (!acc[p.aluno_id]) acc[p.aluno_id] = [];
    acc[p.aluno_id].push(p);
    return acc;
  }, {} as Record<string, typeof pagamentos>);

  const addAlunoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teologia_alunos").insert({
        member_id: novoMemberId,
        valor_total: parseFloat(novoValor) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teologia-alunos"] });
      toast({ title: "Aluno adicionado com sucesso" });
      setAddAlunoOpen(false);
      setNovoMemberId("");
      setNovoValor("");
    },
    onError: (e: any) => {
      toast({ title: "Erro ao adicionar aluno", description: e.message, variant: "destructive" });
    },
  });

  const addPagamentoMutation = useMutation({
    mutationFn: async () => {
      if (!addPagamentoAlunoId) return;
      const payload = {
        data_pagamento: pgtoData,
        forma_pagamento: pgtoForma,
        valor: parseFloat(pgtoValor) || 0,
      };
      if (editingPagamento) {
        const { error } = await supabase.from("teologia_pagamentos").update(payload).eq("id", editingPagamento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teologia_pagamentos").insert({
          ...payload,
          aluno_id: addPagamentoAlunoId,
          registrado_por: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teologia-pagamentos"] });
      toast({ title: editingPagamento ? "Pagamento atualizado" : "Pagamento registrado" });
      setAddPagamentoAlunoId(null);
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
    mutationFn: async () => {
      if (!deleteTarget) return;
      const table = deleteTarget.type === "aluno" ? "teologia_alunos" : "teologia_pagamentos";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teologia-alunos"] });
      queryClient.invalidateQueries({ queryKey: ["teologia-pagamentos"] });
      toast({ title: "Registro excluído" });
      setDeleteTarget(null);
    },
    onError: (e: any) => {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    },
  });

  // Get unique turmas
  const normalizeTurma = (turma?: string | null) =>
    (turma || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");

  const getTurmaDisplayName = (turma?: string | null) => {
    const cleaned = (turma || "").trim().replace(/\s+/g, " ");
    return cleaned || "—";
  };

  const turmaDisplayByKey = alunos.reduce((acc: Record<string, string>, a: any) => {
    const cleaned = getTurmaDisplayName(a.turma);
    const key = normalizeTurma(a.turma);

    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = cleaned;
      return acc;
    }

    const current = acc[key];
    const currentIsUpper = current === current.toUpperCase();
    const nextIsUpper = cleaned === cleaned.toUpperCase();

    if (currentIsUpper && !nextIsUpper) {
      acc[key] = cleaned;
    }

    return acc;
  }, {});

  const turmas = Object.entries(turmaDisplayByKey)
    .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
    .map(([, label]) => label);

  // Helper: compute status for an aluno
  const getAlunoStatus = (aluno: any) => {
    const pgtos = pagamentosByAluno[aluno.id] || [];
    const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const saldo = Number(aluno.valor_total || 0) - pago;
    return saldo <= 0 ? "Quitado" : pago > 0 ? "Parcial" : "Pendente";
  };

  // Column filter options
  const turmaOptions = [...new Set(alunos.map((a: any) => getTurmaDisplayName(a.turma)))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const statusOptions = ["Quitado", "Parcial", "Pendente"];

  // Initialize column filters when data loads
  useEffect(() => {
    if (turmaOptions.length > 0 && colFilterTurma.size === 0) {
      setColFilterTurma(new Set(turmaOptions));
    }
  }, [turmaOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (colFilterStatus.size === 0) {
      setColFilterStatus(new Set(statusOptions));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = alunos
    .filter((a: any) => {
      const nome = a.nome_aluno || a.members?.full_name || "";
      const turmaDisplay = getTurmaDisplayName(a.turma);
      const turmaKey = normalizeTurma(a.turma);
      const selectedTurmaKey = turmaFilter === "todas" ? "" : normalizeTurma(turmaFilter);
      const matchSearch = !search || nome.toLowerCase().includes(search.toLowerCase());
      const matchTurma = turmaFilter === "todas" || turmaKey === selectedTurmaKey;
      const matchColTurma = colFilterTurma.size === 0 || colFilterTurma.has(turmaDisplay);
      const matchColStatus = colFilterStatus.size === 0 || colFilterStatus.has(getAlunoStatus(a));
      return matchSearch && matchTurma && matchColTurma && matchColStatus;
    })
    .sort((a: any, b: any) => {
      const nomeA = (a.nome_aluno || a.members?.full_name || "").toLowerCase();
      const nomeB = (b.nome_aluno || b.members?.full_name || "").toLowerCase();
      return nomeA.localeCompare(nomeB, "pt-BR");
    });

  // Totals (based on filtered)
  const totalDevido = filtered.reduce((s: number, a: any) => s + Number(a.valor_total || 0), 0);
  const filteredIds = new Set(filtered.map((a: any) => a.id));
  const filteredPagamentos = pagamentos.filter(p => filteredIds.has(p.aluno_id));
  const totalPago = filteredPagamentos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
  const totalSaldo = totalDevido - totalPago;

  // Status counts
  const quitados = filtered.filter((a: any) => getAlunoStatus(a) === "Quitado").length;
  const parciais = filtered.filter((a: any) => getAlunoStatus(a) === "Parcial").length;
  const pendentesCount = filtered.filter((a: any) => getAlunoStatus(a) === "Pendente").length;

  // Payment method breakdown
  const totalByPaymentMethod = filteredPagamentos.reduce((acc: Record<string, number>, p: any) => {
    const forma = p.forma_pagamento || "outros";
    acc[forma] = (acc[forma] || 0) + Number(p.valor || 0);
    return acc;
  }, {});

  // Fetch despesas
  const { data: despesas = [] } = useQuery({
    queryKey: ["teologia-despesas-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teologia_despesas").select("valor");
      if (error) throw error;
      return data || [];
    },
  });
  const totalDespesas = despesas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
  const saldoGeral = totalPago - totalDespesas;

  // Per-turma report (based on filtered, merging labels with different casing)
  const turmaReportKeys = [...turmas];
  const alunosSemTurma = filtered.filter((a: any) => !normalizeTurma(a.turma));
  if (alunosSemTurma.length > 0) turmaReportKeys.push("Sem turma");

  const turmaReport = turmaReportKeys.map((turma) => {
    const turmaAlunos = turma === "Sem turma"
      ? filtered.filter((a: any) => !normalizeTurma(a.turma))
      : filtered.filter((a: any) => normalizeTurma(a.turma) === normalizeTurma(turma));
    const turmaIds = new Set(turmaAlunos.map((a: any) => a.id));
    const turmaPagamentos = pagamentos.filter(p => turmaIds.has(p.aluno_id));
    const devido = turmaAlunos.reduce((s: number, a: any) => s + Number(a.valor_total || 0), 0);
    const pago = turmaPagamentos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const quitados = turmaAlunos.filter((a: any) => {
      const pgtos = pagamentosByAluno[a.id] || [];
      const totalPg = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
      return totalPg >= Number(a.valor_total || 0);
    }).length;
    return { turma, total: turmaAlunos.length, devido, pago, saldo: devido - pago, quitados };
  });

  // Export columns for alunos
  const alunoExportColumns: ExportColumn[] = [
    { header: "Aluno", accessor: (r: any) => r.nome },
    { header: "Turma", accessor: (r: any) => r.turma },
    { header: "Valor Total", accessor: (r: any) => r.valorTotal, type: "currency" },
    { header: "Pago", accessor: (r: any) => r.pago, type: "currency" },
    { header: "Saldo", accessor: (r: any) => r.saldo, type: "currency" },
    { header: "Status", accessor: (r: any) => r.status },
  ];

  const alunoExportData = filtered.map((a: any) => {
    const pgtos = pagamentosByAluno[a.id] || [];
    const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const saldo = Number(a.valor_total || 0) - pago;
    return {
      nome: a.nome_aluno || a.members?.full_name || "",
      turma: getTurmaDisplayName(a.turma),
      valorTotal: Number(a.valor_total || 0),
      pago,
      saldo,
      status: saldo <= 0 ? "Quitado" : pago > 0 ? "Parcial" : "Pendente",
    };
  });

  // Export columns for turma report
  const turmaExportColumns: ExportColumn[] = [
    { header: "Turma", accessor: "turma" },
    { header: "Alunos", accessor: "total", type: "number" },
    { header: "Quitados", accessor: "quitados", type: "number" },
    { header: "Total Devido", accessor: "devido", type: "currency" },
    { header: "Total Pago", accessor: "pago", type: "currency" },
    { header: "Saldo Devedor", accessor: "saldo", type: "currency" },
    { header: "% Arrecadado", accessor: (r: any) => r.devido > 0 ? `${Math.round((r.pago / r.devido) * 100)}%` : "0%" },
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
            <CardTitle className="text-sm font-medium">Alunos</CardTitle>
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              {turmaReport.map((t) => (
                <div key={t.turma}>{t.turma}: {t.total}</div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Previsão de Valores</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDevido)}</div>
            <p className="text-xs text-muted-foreground">
              Soma dos valores dos cursos
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
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, value]) => (
                    <div key={method} className="flex justify-between">
                      <span>{FORMAS_LABELS[method] || method}</span>
                      <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                    </div>
                  ))}
                <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-foreground">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(totalPago)}</span>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {quitados} pagos, {parciais} parciais, {pendentesCount} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor a Receber</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalSaldo)}</div>
            <p className="text-xs text-muted-foreground">
              {pendentesCount} pendentes
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
            <p className="text-xs text-muted-foreground">
              Soma dos custos do curso
            </p>
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
            <p className="text-xs text-muted-foreground">
              Receitas pagas − Despesas
            </p>
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
        </TabsList>

        <TabsContent value="receitas" className="space-y-6">
          {/* Search + Add */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
              <SearchInput
                placeholder="Buscar aluno..."
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
                  {turmas.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <ExportButton
                data={alunoExportData}
                columns={alunoExportColumns}
                filename="teologia-alunos"
                title="Financeiro - Curso de Teologia"
                sheetName="Alunos"
              />
              <Button onClick={() => setAddAlunoOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Aluno
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>
                    <ColumnFilterPopover
                      title="Turma"
                      options={turmaOptions}
                      selected={colFilterTurma}
                      onChange={setColFilterTurma}
                    />
                  </TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>
                    <ColumnFilterPopover
                      title="Status"
                      options={statusOptions}
                      selected={colFilterStatus}
                      onChange={setColFilterStatus}
                    />
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((aluno: any) => {
                    const pgtos = pagamentosByAluno[aluno.id] || [];
                    const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
                    const saldo = Number(aluno.valor_total || 0) - pago;
                    const isExpanded = expandedId === aluno.id;

                    return (
                      <>
                        <TableRow
                          key={aluno.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedId(isExpanded ? null : aluno.id)}
                        >
                          <TableCell>
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </TableCell>
                          <TableCell className="font-medium">{aluno.nome_aluno || aluno.members?.full_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{(aluno as any).turma || "—"}</TableCell>
                          <TableCell>{formatCurrency(Number(aluno.valor_total))}</TableCell>
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: "aluno", id: aluno.id });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${aluno.id}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-sm">Pagamentos</h4>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAddPagamentoAlunoId(aluno.id);
                                      setPgtoData(todayDateStr());
                                      setPgtoForma("");
                                      setPgtoValor("");
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
                                        <TableHead className="w-10"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {pgtos.map((p: any) => (
                                        <TableRow key={p.id}>
                                          <TableCell>{formatDateBR(p.data_pagamento)}</TableCell>
                                          <TableCell>{FORMAS_LABELS[p.forma_pagamento] || p.forma_pagamento}</TableCell>
                                          <TableCell className="text-green-600 font-medium">{formatCurrency(Number(p.valor))}</TableCell>
                                          <TableCell>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingPagamento(p);
                                                  setAddPagamentoAlunoId(aluno.id);
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
                                                <Trash2 className="w-3 h-3 text-destructive" />
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

          {/* Relatório por Turma */}
          {turmaReport.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Relatório por Turma
                  </CardTitle>
                  <ExportButton
                    data={turmaReport}
                    columns={turmaExportColumns}
                    filename="teologia-relatorio-turmas"
                    title="Relatório por Turma - Curso de Teologia"
                    sheetName="Turmas"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turma</TableHead>
                        <TableHead className="text-center">Alunos</TableHead>
                        <TableHead className="text-center">Quitados</TableHead>
                        <TableHead>Total Devido</TableHead>
                        <TableHead>Total Pago</TableHead>
                        <TableHead>Saldo Devedor</TableHead>
                        <TableHead className="text-center">% Arrecadado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {turmaReport.map((r) => {
                        const pct = r.devido > 0 ? Math.round((r.pago / r.devido) * 100) : 0;
                        return (
                          <TableRow key={r.turma}>
                            <TableCell className="font-medium">{r.turma}</TableCell>
                            <TableCell className="text-center">{r.total}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                                {r.quitados}/{r.total}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(r.devido)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(r.pago)}</TableCell>
                            <TableCell className={r.saldo > 0 ? "text-destructive" : "text-green-600"}>
                              {formatCurrency(r.saldo)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={addAlunoOpen} onOpenChange={setAddAlunoOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Aluno</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Membro</Label>
                  <MemberSelect value={novoMemberId} onChange={setNovoMemberId} />
                </div>
                <div>
                  <Label>Valor Total do Curso (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={novoValor}
                    onChange={(e) => setNovoValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddAlunoOpen(false)}>Cancelar</Button>
                <Button
                  onClick={() => addAlunoMutation.mutate()}
                  disabled={!novoMemberId || !novoValor || addAlunoMutation.isPending}
                >
                  {addAlunoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Registrar Pagamento */}
          <Dialog open={!!addPagamentoAlunoId} onOpenChange={(o) => { if (!o) { setAddPagamentoAlunoId(null); setEditingPagamento(null); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPagamento ? "Editar Pagamento" : "Registrar Pagamento"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Data</Label>
                  <DateInput value={pgtoData} onChange={setPgtoData} />
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={pgtoForma} onValueChange={setPgtoForma}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pgtoValor}
                    onChange={(e) => setPgtoValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddPagamentoAlunoId(null); setEditingPagamento(null); }}>Cancelar</Button>
                <Button
                  onClick={() => addPagamentoMutation.mutate()}
                  disabled={!pgtoForma || !pgtoValor || addPagamentoMutation.isPending}
                >
                  {addPagamentoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {editingPagamento ? "Salvar" : "Registrar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirm delete */}
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(o) => !o && setDeleteTarget(null)}
            onConfirm={() => deleteMutation.mutate()}
            title={deleteTarget?.type === "aluno" ? "Excluir aluno" : "Excluir pagamento"}
            description={deleteTarget?.type === "aluno"
              ? "Isso removerá o aluno e todos os pagamentos associados. Deseja continuar?"
              : "Deseja excluir este pagamento?"}
          />
        </TabsContent>

        <TabsContent value="despesas">
          <TeologiaDespesasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeologiaFinanceiroTab;
