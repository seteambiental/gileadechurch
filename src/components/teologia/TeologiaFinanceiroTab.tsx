import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { DollarSign, Plus, Search, ChevronDown, ChevronRight, Trash2, Loader2, GraduationCap, Check, Clock, BarChart3, Filter } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addAlunoOpen, setAddAlunoOpen] = useState(false);
  const [addPagamentoAlunoId, setAddPagamentoAlunoId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "aluno" | "pagamento"; id: string } | null>(null);

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
        .select("*, members!inner(full_name)")
        .order("created_at", { ascending: false });
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
      const { error } = await supabase.from("teologia_pagamentos").insert({
        aluno_id: addPagamentoAlunoId,
        data_pagamento: pgtoData,
        forma_pagamento: pgtoForma,
        valor: parseFloat(pgtoValor) || 0,
        registrado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teologia-pagamentos"] });
      toast({ title: "Pagamento registrado" });
      setAddPagamentoAlunoId(null);
      setPgtoData(todayDateStr());
      setPgtoForma("");
      setPgtoValor("");
    },
    onError: (e: any) => {
      toast({ title: "Erro ao registrar pagamento", description: e.message, variant: "destructive" });
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
  const turmas = [...new Set(alunos.map((a: any) => a.turma).filter(Boolean))].sort() as string[];

  const filtered = alunos.filter((a: any) => {
    const matchSearch = !search || a.members?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchTurma = turmaFilter === "todas" || a.turma === turmaFilter;
    return matchSearch && matchTurma;
  });

  // Totals (based on filtered)
  const totalDevido = filtered.reduce((s: number, a: any) => s + Number(a.valor_total || 0), 0);
  const filteredIds = new Set(filtered.map((a: any) => a.id));
  const filteredPagamentos = pagamentos.filter(p => filteredIds.has(p.aluno_id));
  const totalPago = filteredPagamentos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
  const totalSaldo = totalDevido - totalPago;

  // Per-turma report
  const turmaReport = turmas.map((turma) => {
    const turmaAlunos = alunos.filter((a: any) => a.turma === turma);
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
      nome: a.members?.full_name || "",
      turma: a.turma || "—",
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
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-xs text-muted-foreground">Alunos</p>
              <p className="font-bold text-lg">{alunos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Devido</p>
              <p className="font-bold text-lg">{formatCurrency(totalDevido)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              <p className="font-bold text-lg text-green-600">{formatCurrency(totalPago)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Saldo Devedor</p>
              <p className="font-bold text-lg text-destructive">{formatCurrency(totalSaldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
              <TableHead>Turma</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Status</TableHead>
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
                      <TableCell className="font-medium">{aluno.members?.full_name}</TableCell>
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
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Relatório por Turma
            </CardTitle>
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
      <Dialog open={!!addPagamentoAlunoId} onOpenChange={(o) => !o && setAddPagamentoAlunoId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
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
            <Button variant="outline" onClick={() => setAddPagamentoAlunoId(null)}>Cancelar</Button>
            <Button
              onClick={() => addPagamentoMutation.mutate()}
              disabled={!pgtoForma || !pgtoValor || addPagamentoMutation.isPending}
            >
              {addPagamentoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Registrar
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
    </div>
  );
};

export default TeologiaFinanceiroTab;
