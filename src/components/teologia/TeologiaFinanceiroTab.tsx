import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDateBR } from "@/lib/masks";
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

  const filtered = alunos.filter((a: any) =>
    !search || a.members?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Totals
  const totalDevido = alunos.reduce((s, a) => s + Number(a.valor_total || 0), 0);
  const totalPago = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const totalSaldo = totalDevido - totalPago;

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
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddAlunoOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Adicionar Aluno
        </Button>
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

      {/* Dialog: Adicionar Aluno */}
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
