import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportButton } from "@/components/ui/export-button";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Info, Users, DollarSign, Clock, TrendingUp, ArrowDownCircle, Scale, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JiuJitsuDespesasTab from "./JiuJitsuDespesasTab";
import { differenceInYears } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";

const STATUS_COLORS: Record<string, string> = {
  pago: "bg-green-100 text-green-800",
  pendente: "bg-yellow-100 text-yellow-800",
  atrasado: "bg-red-100 text-red-800",
};

/** Calcula o valor da mensalidade com base na idade do aluno */
function calcularMensalidade(dataNascimento: string | null): { valor: number; faixa: string } {
  if (!dataNascimento) return { valor: 50, faixa: "Sem data de nascimento" };
  const idade = differenceInYears(new Date(), parseLocalDate(dataNascimento));
  if (idade >= 6 && idade <= 9) return { valor: 0, faixa: `${idade} anos — Isento` };
  if (idade >= 10 && idade <= 13) return { valor: 25, faixa: `${idade} anos — R$ 25,00` };
  return { valor: 50, faixa: `${idade} anos — R$ 50,00` };
}

export function JiuJitsuFinanceiroTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [mesRef, setMesRef] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("pendente");
  const [dataPagamento, setDataPagamento] = useState("");
  const [infoMensalidade, setInfoMensalidade] = useState("");
  const [editingPagamento, setEditingPagamento] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Column filters
  const [statusColFilter, setStatusColFilter] = useState<Set<string>>(new Set());
  const [turmaColFilter, setTurmaColFilter] = useState<Set<string>>(new Set());

  const { data: alunos = [] } = useQuery({
    queryKey: ["jiujitsu_alunos_financeiro"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jiujitsu_alunos")
        .select("*, jiujitsu_turmas(nome)")
        .eq("ativo", true)
        .order("nome");
      return (data || []) as any[];
    },
  });

  const { data: pagamentos = [] } = useQuery({
    queryKey: ["jiujitsu_pagamentos"],
    queryFn: async () => {
      const { data } = await supabase.from("jiujitsu_pagamentos").select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Group pagamentos by aluno
  const pagamentosByAluno = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of pagamentos) {
      if (!map[p.aluno_id]) map[p.aluno_id] = [];
      map[p.aluno_id].push(p);
    }
    return map;
  }, [pagamentos]);

  // Build enriched aluno rows
  const alunoRows = useMemo(() => {
    return alunos.map((a: any) => {
      const pgtos = pagamentosByAluno[a.id] || [];
      const { valor: mensalidade, faixa } = calcularMensalidade(a.data_nascimento);
      const totalPago = pgtos.filter((p: any) => p.status === "pago").reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
      const totalPendente = pgtos.filter((p: any) => p.status !== "pago").reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
      const turma = a.jiujitsu_turmas?.nome || "Sem turma";
      const statusGeral = mensalidade === 0 ? "Isento" : totalPago > 0 && totalPendente === 0 && pgtos.length > 0 ? "Em dia" : totalPendente > 0 ? "Pendente" : "Sem registro";
      return { ...a, pgtos, mensalidade, faixa, totalPago, totalPendente, turma, statusGeral };
    });
  }, [alunos, pagamentosByAluno]);

  // Filter options
  const turmaOptions = useMemo(() => [...new Set(alunoRows.map((a: any) => a.turma))], [alunoRows]);
  const statusOptions = useMemo(() => [...new Set(alunoRows.map((a: any) => a.statusGeral))], [alunoRows]);

  useMemo(() => {
    if (turmaColFilter.size === 0 && turmaOptions.length > 0) setTurmaColFilter(new Set(turmaOptions));
  }, [turmaOptions]);
  useMemo(() => {
    if (statusColFilter.size === 0 && statusOptions.length > 0) setStatusColFilter(new Set(statusOptions));
  }, [statusOptions]);

  const filtered = useMemo(() => {
    return alunoRows.filter((a: any) => {
      if (search && !a.nome?.toLowerCase().includes(search.toLowerCase())) return false;
      if (turmaColFilter.size > 0 && turmaColFilter.size < turmaOptions.length && !turmaColFilter.has(a.turma)) return false;
      if (statusColFilter.size > 0 && statusColFilter.size < statusOptions.length && !statusColFilter.has(a.statusGeral)) return false;
      return true;
    });
  }, [alunoRows, search, turmaColFilter, turmaOptions.length, statusColFilter, statusOptions.length]);

  // Auto-preencher valor quando selecionar aluno
  useEffect(() => {
    if (!alunoId) {
      setInfoMensalidade("");
      return;
    }
    const aluno = alunos.find((a: any) => a.id === alunoId);
    if (aluno) {
      const { valor: valorCalc, faixa } = calcularMensalidade(aluno.data_nascimento);
      setValor(valorCalc.toString());
      setInfoMensalidade(faixa);
    }
  }, [alunoId, alunos]);

  // Dashboard stats
  const stats = useMemo(() => {
    const totalAlunos = alunos.length;
    const totalPrevisto = alunos.reduce((s: number, a: any) => s + calcularMensalidade(a.data_nascimento).valor, 0);
    const totalPago = pagamentos.filter((p: any) => p.status === "pago").reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const totalPendente = pagamentos.filter((p: any) => p.status !== "pago").reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const pagos = pagamentos.filter((p: any) => p.status === "pago").length;
    const pendentes = pagamentos.filter((p: any) => p.status === "pendente").length;
    const atrasados = pagamentos.filter((p: any) => p.status === "atrasado").length;
    return { totalAlunos, totalPrevisto, totalPago, totalPendente, pagos, pendentes, atrasados };
  }, [alunos, pagamentos]);

  const { data: jiuDespesas = [] } = useQuery({
    queryKey: ["jiujitsu-despesas-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jiujitsu_despesas").select("valor");
      if (error) throw error;
      return data || [];
    },
  });
  const totalDespesas = jiuDespesas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
  const saldoGeral = stats.totalPago - totalDespesas;

  const resetForm = () => {
    setAlunoId(""); setMesRef(""); setValor(""); setStatus("pendente"); setDataPagamento(""); setInfoMensalidade("");
    setEditingPagamento(null);
  };

  const handleSave = async () => {
    if (editingPagamento) {
      const { error } = await supabase.from("jiujitsu_pagamentos").update({
        aluno_id: alunoId,
        mes_referencia: mesRef,
        valor: Number(valor) || 0,
        status,
        data_pagamento: dataPagamento || null,
      }).eq("id", editingPagamento.id);
      if (error) {
        toast({ title: "Erro ao atualizar pagamento", variant: "destructive" });
      } else {
        toast({ title: "Pagamento atualizado!" });
        queryClient.invalidateQueries({ queryKey: ["jiujitsu_pagamentos"] });
        setFormOpen(false);
        resetForm();
      }
    } else {
      if (!alunoId || !mesRef) {
        toast({ title: "Selecione o aluno e o mês", variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("jiujitsu_pagamentos").insert({
        aluno_id: alunoId,
        mes_referencia: mesRef,
        valor: Number(valor) || 0,
        status,
        data_pagamento: dataPagamento || null,
      });
      if (error) {
        toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
      } else {
        toast({ title: "Pagamento registrado!" });
        queryClient.invalidateQueries({ queryKey: ["jiujitsu_pagamentos"] });
        setFormOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("jiujitsu_pagamentos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir pagamento", variant: "destructive" });
    } else {
      toast({ title: "Pagamento excluído!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_pagamentos"] });
    }
  };

  const handleEdit = (p: any) => {
    setEditingPagamento(p);
    setAlunoId(p.aluno_id);
    setMesRef(p.mes_referencia || "");
    setValor(String(p.valor || ""));
    setStatus(p.status || "pendente");
    setDataPagamento(p.data_pagamento || "");
    const aluno = alunos.find((a: any) => a.id === p.aluno_id);
    if (aluno) {
      const { faixa } = calcularMensalidade(aluno.data_nascimento);
      setInfoMensalidade(faixa);
    }
    setFormOpen(true);
  };

  const handleAddForAluno = (alunoIdParam: string) => {
    resetForm();
    setAlunoId(alunoIdParam);
    setFormOpen(true);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const update: any = { status: newStatus };
    if (newStatus === "pago") {
      const now = new Date();
      update.data_pagamento = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    }
    const { error } = await supabase.from("jiujitsu_pagamentos").update(update).eq("id", id);
    if (!error) {
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_pagamentos"] });
    }
  };

  const exportData = useMemo(() => {
    return filtered.map((a: any) => ({
      nome: a.nome,
      turma: a.turma,
      mensalidade: a.mensalidade === 0 ? "Isento" : formatCurrency(a.mensalidade),
      total_pago: formatCurrency(a.totalPago),
      total_pendente: formatCurrency(a.totalPendente),
      status: a.statusGeral,
    }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Dashboard cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAlunos}</div>
            <p className="text-xs text-muted-foreground mt-1">Alunos matriculados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensalidade Prevista</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPrevisto)}</div>
            <p className="text-xs text-muted-foreground">Valor mensal esperado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Já Pago</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPago)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pagos} pagos, {stats.pendentes} pendentes, {stats.atrasados} atrasados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPendente)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendentes + stats.atrasados} registros em aberto
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
            <p className="text-xs text-muted-foreground">Soma dos custos</p>
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
        </TabsList>

        <TabsContent value="receitas" className="space-y-6">
          {/* Tabela de valores */}
          <Card className="border-dashed">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tabela de Mensalidades</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">6–9 anos</Badge>
                  <span className="text-muted-foreground">Isento</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">10–13 anos</Badge>
                  <span className="text-muted-foreground">R$ 25,00</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">14+ anos</Badge>
                  <span className="text-muted-foreground">R$ 50,00</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <SearchInput
              placeholder="Buscar por aluno..."
              value={search}
              onChange={setSearch}
              className="w-full sm:w-80"
            />
            <div className="flex gap-2">
              <ExportButton
                data={exportData}
                columns={[
                  { header: "Aluno", accessor: "nome" },
                  { header: "Turma", accessor: "turma" },
                  { header: "Mensalidade", accessor: "mensalidade" },
                  { header: "Total Pago", accessor: "total_pago" },
                  { header: "Pendente", accessor: "total_pendente" },
                  { header: "Status", accessor: "status" },
                ]}
                filename="jiujitsu-financeiro"
                title="Financeiro - Jiu-Jitsu"
                sheetName="Financeiro"
              />
              <Button onClick={() => { resetForm(); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Novo Pagamento
              </Button>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Turma" options={turmaOptions} selected={turmaColFilter} onChange={setTurmaColFilter} />
                  </TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Total Pago</TableHead>
                  <TableHead>Pendente</TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Status" options={statusOptions} selected={statusColFilter} onChange={setStatusColFilter} />
                  </TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a: any) => (
                    <>
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      >
                        <TableCell className="px-2">
                          {a.pgtos.length > 0 ? (
                            expandedId === a.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                          ) : null}
                        </TableCell>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{a.turma}</Badge>
                        </TableCell>
                        <TableCell>
                          {a.mensalidade === 0
                            ? <Badge variant="outline" className="text-xs">Isento</Badge>
                            : formatCurrency(a.mensalidade)
                          }
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">{formatCurrency(a.totalPago)}</TableCell>
                        <TableCell className={a.totalPendente > 0 ? "text-yellow-600 font-medium" : ""}>
                          {formatCurrency(a.totalPendente)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={a.statusGeral === "Isento" ? "outline" : a.statusGeral === "Em dia" ? "default" : a.statusGeral === "Pendente" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {a.statusGeral}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleAddForAluno(a.id); }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Pgto
                          </Button>
                        </TableCell>
                      </TableRow>
                      {/* Expanded detail rows */}
                      {expandedId === a.id && a.pgtos.length > 0 && (
                        <TableRow key={`${a.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="px-8 py-3">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Mês Ref.</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data Pgto.</TableHead>
                                    <TableHead className="w-32">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {a.pgtos.map((p: any) => (
                                    <TableRow key={p.id}>
                                      <TableCell>{p.mes_referencia}</TableCell>
                                      <TableCell>
                                        {Number(p.valor) === 0
                                          ? <Badge variant="outline" className="text-xs">Isento</Badge>
                                          : formatCurrency(Number(p.valor))
                                        }
                                      </TableCell>
                                      <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                                          {p.status === "pago" ? "Pago" : p.status === "pendente" ? "Pendente" : "Atrasado"}
                                        </span>
                                      </TableCell>
                                      <TableCell>{p.data_pagamento || "—"}</TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          {p.status !== "pago" && (
                                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(p.id, "pago")}>
                                              Pago
                                            </Button>
                                          )}
                                          <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                                            <Pencil className="w-3 h-3 text-muted-foreground" />
                                          </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                                            <Trash2 className="w-3 h-3 text-destructive" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="despesas">
          <JiuJitsuDespesasTab />
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPagamento ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Aluno</Label>
              <Select value={alunoId} onValueChange={setAlunoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>
                  {alunos.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {infoMensalidade && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {infoMensalidade}
                </p>
              )}
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
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editingPagamento ? "Salvar" : "Registrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
