import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { formatCurrency, formatDateBR } from "@/lib/masks";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Check, Clock, TrendingUp, Users, Search, ArrowDownCircle, Scale, FileSpreadsheet, FileText, Columns3, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImpactoDespesasTab from "./ImpactoDespesasTab";
import { exportGenericToExcel, exportGenericToPDF } from "@/lib/export";



const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Líderes e Anfitriões",
  equipe: "Equipe",
};

const ImpactoFinanceiroTab = () => {
  const [selectedEventoId, setSelectedEventoId] = useState("");
  const [searchNome, setSearchNome] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");

  const allColumns = [
    { key: "nome", label: "Nome" },
    { key: "tipo", label: "Tipo" },
    { key: "referencia", label: "Referência" },
    { key: "valor_inscricao", label: "Valor Inscrição" },
    { key: "valor_pago", label: "Valor Pago" },
    { key: "saldo", label: "Saldo" },
    { key: "previsoes", label: "Previsões Pgto" },
    { key: "forma_pagamento", label: "Forma Pgto" },
    { key: "status", label: "Status" },
  ] as const;

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(allColumns.map((c) => c.key))
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: string) => visibleColumns.has(key);

  const { data: impactoEventos } = useQuery({
    queryKey: ["impacto-eventos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, data_fim, tipo, valor_inscricao, valores_por_tipo, tipos_inscricao, tem_custo")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: agendaEventos } = useQuery({
    queryKey: ["agenda-eventos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim")
        .eq("necessita_inscricao", true)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const eventos = useMemo(() => {
    const impacto = (impactoEventos || []).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_inicio,
    }));
    const agenda = (agendaEventos || []).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_evento,
    }));
    // Deduplicate by ID (same event can exist in both tables)
    const impactoIds = new Set(impacto.map((e) => e.id));
    const uniqueAgenda = agenda.filter((e) => !impactoIds.has(e.id));
    return [...impacto, ...uniqueAgenda].sort((a, b) =>
      new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
    );
  }, [impactoEventos, agendaEventos]);

  const { data: rawImpactoInscricoes, isLoading } = useQuery({
    queryKey: ["impacto-inscricoes-financeiro", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("id, member_id, nome, tipo_inscricao, valor_inscricao, valor_pago, status_pagamento, forma_pagamento, pagamentos, created_at, referencia, previsoes_pagamento")
        .eq("evento_id", selectedEventoId)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventoId,
  });

  // Inscrições pendentes de aprovação (não espelhadas ainda em impacto_inscricoes)
  const { data: rawAgendaPendentes } = useQuery({
    queryKey: ["agenda-inscricoes-pendentes-financeiro", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("id, member_id, nome_participante, tipo_inscricao, valor_inscricao, forma_pagamento, created_at")
        .eq("evento_id", selectedEventoId)
        .eq("aprovado", false)
        .order("nome_participante");
      if (error) throw error;
      return (data || []).map((i: any) => ({
        id: i.id,
        member_id: i.member_id || null,
        nome: i.nome_participante,
        tipo_inscricao: i.tipo_inscricao || "membro",
        valor_inscricao: i.valor_inscricao || null,
        valor_pago: null,
        status_pagamento: "pendente",
        forma_pagamento: i.forma_pagamento || null,
        pagamentos: null,
        created_at: i.created_at,
        referencia: null,
        previsoes_pagamento: null,
      }));
    },
    enabled: !!selectedEventoId,
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["impacto-despesas", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_despesas")
        .select("valor")
        .eq("evento_id", selectedEventoId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventoId,
  });

  const inscricoes = useMemo(() => {
    const imp = rawImpactoInscricoes || [];
    const pendentes = rawAgendaPendentes || [];

    // Nomes já existentes em impacto_inscricoes (fonte autorizada pós-aprovação)
    const impMemberIds = new Set(imp.map((i: any) => i.member_id).filter(Boolean));
    const impNomes = new Set(
      imp.map((i: any) =>
        (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      ).filter(Boolean)
    );

    // Incluir apenas pendentes que ainda não foram migrados para impacto_inscricoes
    const uniquePendentes = pendentes.filter((i: any) => {
      if (i.member_id && impMemberIds.has(i.member_id)) return false;
      const nomeNorm = (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      if (nomeNorm && impNomes.has(nomeNorm)) return false;
      return true;
    });

    return [...imp, ...uniquePendentes].sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  }, [rawImpactoInscricoes, rawAgendaPendentes]);


  const selectedEvento = eventos?.find((e) => e.id === selectedEventoId);

  const inscricoesFiltradas = useMemo(() => {
    if (!inscricoes) return [];
    if (!searchNome.trim()) return inscricoes;
    const q = searchNome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return inscricoes.filter((i) =>
      i.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(q)
    );
  }, [inscricoes, searchNome]);

  const totalInscritos = inscricoes?.length || 0;

  // Calculate real totals from inscription data
  const totalPrevisao = inscricoes?.reduce((sum, i) => sum + (i.valor_inscricao || 0), 0) || 0;
  const totalPago = inscricoes?.reduce((sum, i) => sum + (i.valor_pago || 0), 0) || 0;
  const totalAReceber = Math.max(0, totalPrevisao - totalPago);
  const totalDespesas = (despesas as any[]).reduce((sum, d) => sum + (d.valor || 0), 0);
  const saldoEvento = totalPago - totalDespesas;

  // Calculate forecast total up to selected date
  const totalPrevisaoPorData = useMemo(() => {
    if (!dataPrevisao || !inscricoes) return 0;
    return inscricoes.reduce((sum, i) => {
      const previsoes = i.previsoes_pagamento as Array<{ data: string; valor: number }> | null;
      if (!previsoes || !Array.isArray(previsoes)) return sum;
      return sum + previsoes
        .filter((p) => p.data && p.data <= dataPrevisao)
        .reduce((s, p) => s + (parseFloat(String(p.valor)) || 0), 0);
    }, 0);
  }, [inscricoes, dataPrevisao]);

  // Count by status
  const pagos = inscricoes?.filter((i) => i.status_pagamento === "pago").length || 0;
  const parciais = inscricoes?.filter((i) => i.status_pagamento === "parcial").length || 0;
  const pendentes = inscricoes?.filter((i) => i.status_pagamento === "pendente").length || 0;

  // Calculate totals by payment method
  const totalByPaymentMethod = inscricoes?.reduce((acc, i) => {
    const pagamentosArr = i.pagamentos as Array<{ tipo: string; valor: string | number }> | null;
    if (pagamentosArr && Array.isArray(pagamentosArr) && pagamentosArr.length > 0) {
      pagamentosArr.forEach((p) => {
        if (p.tipo && parseFloat(String(p.valor)) > 0) {
          acc[p.tipo] = (acc[p.tipo] || 0) + parseFloat(String(p.valor));
        }
      });
    } else if (i.forma_pagamento && (i.valor_pago || 0) > 0) {
      acc[i.forma_pagamento] = (acc[i.forma_pagamento] || 0) + (i.valor_pago || 0);
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
    pix: "PIX",
    dinheiro: "Dinheiro",
    credito: "Cartão Crédito",
    debito: "Cartão Débito",
    cartao_credito: "Cartão Crédito",
    cartao_debito: "Cartão Débito",
    transferencia: "Transferência",
    boleto: "Boleto",
    vale: "Vale",
  };

  // Count by type
  const countByType = inscricoes?.reduce((acc, i) => {
    const tipo = i.tipo_inscricao || "membro";
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" />Pago</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const eventoNomeFinanceiro = eventos?.find((e) => e.id === selectedEventoId)?.titulo || "financeiro";

  const formatPrevisoes = (previsoes: any) => {
    if (!previsoes || !Array.isArray(previsoes) || previsoes.length === 0) return "—";
    return previsoes.map((p: any) => `${formatDateBR(p.data)}: ${formatCurrency(parseFloat(String(p.valor)) || 0)}`).join("; ");
  };

  const getExportColumnsReceitas = () => {
    const all = [
      { key: "nome", header: "Nome", accessor: (row: any) => row.nome },
      { key: "tipo", header: "Tipo", accessor: (row: any) => TIPOS_INSCRICAO_LABELS[row.tipo_inscricao || ""] || row.tipo_inscricao || "—" },
      { key: "referencia", header: "Referência", accessor: (row: any) => row.referencia || "—" },
      { key: "valor_inscricao", header: "Valor Inscrição", accessor: (row: any) => formatCurrency(row.valor_inscricao || 0) },
      { key: "valor_pago", header: "Valor Pago", accessor: (row: any) => formatCurrency(row.valor_pago || 0) },
      { key: "saldo", header: "Saldo", accessor: (row: any) => formatCurrency(Math.max(0, (row.valor_inscricao || 0) - (row.valor_pago || 0))) },
      { key: "previsoes", header: "Previsões Pgto", accessor: (row: any) => formatPrevisoes(row.previsoes_pagamento) },
      { key: "forma_pagamento", header: "Forma Pagamento", accessor: (row: any) => row.forma_pagamento ? (FORMAS_PAGAMENTO_LABELS[row.forma_pagamento] || row.forma_pagamento) : "—" },
      { key: "status", header: "Status", accessor: (row: any) => ({ pago: "Pago", parcial: "Parcial" }[row.status_pagamento] || "Pendente") },
    ];
    return all.filter((c) => visibleColumns.has(c.key));
  };

  const handleExportReceitasExcel = async () => {
    if (!inscricoes.length) return;
    await exportGenericToExcel(inscricoes, getExportColumnsReceitas(), `Financeiro_${eventoNomeFinanceiro}`, "Receitas");
  };

  const handleExportReceitasPDF = () => {
    if (!inscricoes.length) return;
    exportGenericToPDF(inscricoes, getExportColumnsReceitas(), `Financeiro_${eventoNomeFinanceiro}`, `Financeiro — Receitas — ${eventoNomeFinanceiro}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Financeiro</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedEventoId} onValueChange={setSelectedEventoId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {eventos?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {format(parseLocalDate(e.data_inicio), "dd/MM", { locale: ptBR })} — {e.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventoId && inscricoes.length > 0 && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="w-4 h-4 mr-2" />
                    Colunas Relatório
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3" align="end">
                  <p className="text-sm font-medium mb-2">Colunas visíveis</p>
                  <div className="space-y-2">
                    {allColumns.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isCol(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={handleExportReceitasExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportReceitasPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver o financeiro.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Inscrições</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInscritos}</div>
                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {Object.entries(countByType).map(([tipo, count]) => (
                    <div key={tipo}>{TIPOS_INSCRICAO_LABELS[tipo] || tipo}: {count}</div>
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
                <div className="text-2xl font-bold">{formatCurrency(totalPrevisao)}</div>
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
                {Object.keys(totalByPaymentMethod).length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                    {Object.entries(totalByPaymentMethod)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, value]) => (
                        <div key={method} className="flex justify-between">
                          <span>{FORMAS_PAGAMENTO_LABELS[method] || method}</span>
                          <span className="font-medium text-foreground">{formatCurrency(value)}</span>
                        </div>
                      ))}
                    <div className="border-t pt-1 mt-1 flex justify-between font-semibold text-foreground">
                      <span>Total</span>
                      <span className="text-green-600">{formatCurrency(totalPago)}</span>
                    </div>
                  </div>
                )}
                {Object.keys(totalByPaymentMethod).length === 0 && (
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</div>
                )}
                <p className="text-xs text-muted-foreground">
                  {pagos} pagos{parciais > 0 ? `, ${parciais} parciais` : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor a Receber</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalAReceber)}</div>
                <p className="text-xs text-muted-foreground">
                  {pendentes} pendentes
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
                  Soma dos custos do evento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo do Evento</CardTitle>
                <Scale className={`w-4 h-4 ${saldoEvento >= 0 ? "text-green-600" : "text-destructive"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldoEvento >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatCurrency(saldoEvento)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Receitas pagas − Despesas
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Previsão de Recebimentos</CardTitle>
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Até a data</Label>
                    <Input
                      type="date"
                      value={dataPrevisao}
                      onChange={(e) => setDataPrevisao(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${totalPrevisaoPorData > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {dataPrevisao ? formatCurrency(totalPrevisaoPorData) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dataPrevisao ? "valor previsto até a data" : "selecione uma data"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="receitas">
            <TabsList>
              <TabsTrigger value="receitas">Receitas</TabsTrigger>
              <TabsTrigger value="despesas">Despesas</TabsTrigger>
            </TabsList>

            <TabsContent value="receitas" className="space-y-3">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchNome}
                  onChange={(e) => setSearchNome(e.target.value)}
                  className="pl-9"
                />
              </div>
              {isLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : inscricoesFiltradas.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {searchNome ? "Nenhum resultado encontrado." : "Nenhuma inscrição registrada."}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                         {isCol("nome") && <TableHead>Nome</TableHead>}
                         {isCol("tipo") && <TableHead>Tipo</TableHead>}
                         {isCol("referencia") && <TableHead>Referência</TableHead>}
                         {isCol("valor_inscricao") && <TableHead>Valor Inscrição</TableHead>}
                         {isCol("valor_pago") && <TableHead>Valor Pago</TableHead>}
                         {isCol("saldo") && <TableHead>Saldo</TableHead>}
                         {isCol("previsoes") && <TableHead>Previsões</TableHead>}
                         {isCol("forma_pagamento") && <TableHead>Forma Pgto</TableHead>}
                         {isCol("status") && <TableHead>Status</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inscricoesFiltradas.map((inscricao) => {
                        const valorInsc = inscricao.valor_inscricao || 0;
                        const valorPg = inscricao.valor_pago || 0;
                        const saldo = Math.max(0, valorInsc - valorPg);
                        const previsoes = inscricao.previsoes_pagamento as Array<{ data: string; valor: number }> | null;
                        const temPrevisao = previsoes && Array.isArray(previsoes) && previsoes.length > 0;
                        return (
                          <TableRow key={inscricao.id}>
                            {isCol("nome") && (
                              <TableCell className="font-medium">
                                <span className="flex items-center gap-1.5">
                                  {inscricao.nome}
                                  {temPrevisao && (
                                    <CalendarClock className="w-3.5 h-3.5 text-primary shrink-0" />
                                  )}
                                </span>
                              </TableCell>
                            )}
                            {isCol("tipo") && <TableCell>{TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao || ""] || inscricao.tipo_inscricao || "—"}</TableCell>}
                            {isCol("referencia") && <TableCell>{inscricao.referencia || "—"}</TableCell>}
                            {isCol("valor_inscricao") && <TableCell>{formatCurrency(valorInsc)}</TableCell>}
                            {isCol("valor_pago") && <TableCell className="font-medium text-green-600">{formatCurrency(valorPg)}</TableCell>}
                            {isCol("saldo") && (
                              <TableCell className={saldo > 0 ? "font-medium text-yellow-600" : "font-medium text-green-600"}>
                                {formatCurrency(saldo)}
                              </TableCell>
                            )}
                            {isCol("previsoes") && (
                              <TableCell className="text-xs max-w-[200px]">
                                {temPrevisao ? (
                                  <div className="space-y-0.5">
                                    {previsoes!.map((p, idx) => (
                                      <div key={idx}>{formatDateBR(p.data)}: {formatCurrency(parseFloat(String(p.valor)) || 0)}</div>
                                    ))}
                                  </div>
                                ) : "—"}
                              </TableCell>
                            )}
                            {isCol("forma_pagamento") && <TableCell>{inscricao.forma_pagamento || "—"}</TableCell>}
                            {isCol("status") && <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="despesas">
              <ImpactoDespesasTab eventoId={selectedEventoId} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ImpactoFinanceiroTab;
