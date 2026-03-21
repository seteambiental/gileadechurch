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
import { Card, CardContent } from "@/components/ui/card";
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
  DollarSign, Check, Clock, Plus, Search, Users, ChevronDown, ChevronRight, Trash2, Loader2, Filter,
} from "lucide-react";
import { todayDateStr } from "@/lib/date-utils";

const VALOR_CURSO = 100;

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

  // Filter
  const filtered = useMemo(() => {
    return casais.filter((c: any) => {
      const nome = `${c.nome_masculino || ""} ${c.nome_feminino || ""}`.toLowerCase();
      if (search && !nome.includes(search.toLowerCase())) return false;
      if (turmaFilter !== "todas" && c.turma_id !== turmaFilter) return false;
      return true;
    });
  }, [casais, search, turmaFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalCasais = filtered.length;
    const totalDevido = totalCasais * VALOR_CURSO;
    let totalPago = 0;
    let quitados = 0;
    filtered.forEach((c: any) => {
      const pgtos = pagamentosByCasal[c.id] || [];
      const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
      totalPago += pago;
      if (pago >= VALOR_CURSO) quitados++;
    });
    return { totalCasais, totalDevido, totalPago, totalSaldo: totalDevido - totalPago, quitados };
  }, [filtered, pagamentosByCasal]);

  // Add payment mutation
  const addPagamentoMutation = useMutation({
    mutationFn: async () => {
      if (!addPagamentoCasalId) return;
      const casal = casais.find((c: any) => c.id === addPagamentoCasalId);
      const { error } = await supabase.from("casais_pagamentos").insert({
        casal_id: addPagamentoCasalId,
        turma_id: casal?.turma_id || null,
        data_pagamento: pgtoData,
        forma_pagamento: pgtoForma,
        valor: parseFloat(pgtoValor) || 0,
        status: "pago",
        registrado_por: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casais_pagamentos"] });
      toast({ title: "Pagamento registrado" });
      setAddPagamentoCasalId(null);
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
      const { error } = await supabase.from("casais_pagamentos").delete().eq("id", deleteTarget.id);
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

  // Export
  const exportData = filtered.map((c: any) => {
    const pgtos = pagamentosByCasal[c.id] || [];
    const pago = pgtos.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
    const saldo = VALOR_CURSO - pago;
    return {
      esposo: c.nome_masculino || "",
      esposa: c.nome_feminino || "",
      turma: (c.turma as any)?.nome || "—",
      valorTotal: VALOR_CURSO,
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
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-xs text-muted-foreground">Casais</p>
              <p className="font-bold text-lg">{stats.totalCasais}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total Devido</p>
              <p className="font-bold text-lg">{formatCurrency(stats.totalDevido)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              <p className="font-bold text-lg text-green-600">{formatCurrency(stats.totalPago)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Saldo Devedor</p>
              <p className="font-bold text-lg text-destructive">{formatCurrency(stats.totalSaldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar casal..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as turmas</SelectItem>
              {turmas.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <TableHead>Status</TableHead>
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
      <Dialog open={!!addPagamentoCasalId} onOpenChange={(open) => !open && setAddPagamentoCasalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
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
            <Button variant="outline" onClick={() => setAddPagamentoCasalId(null)}>Cancelar</Button>
            <Button
              onClick={() => addPagamentoMutation.mutate()}
              disabled={addPagamentoMutation.isPending || !pgtoForma || !pgtoValor}
            >
              {addPagamentoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Registrar
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
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
