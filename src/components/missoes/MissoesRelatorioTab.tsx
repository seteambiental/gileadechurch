import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/date-utils";
import { FileText, FileSpreadsheet, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDF, exportGenericToExcel } from "@/lib/export";
import { ColumnFilter } from "./ColumnFilter";

interface Props { mesRef: string; cotacao: number }

// Ordem de origem para listagem: membros, manuais, condomínios.
const ORDEM_ORIGEM: Record<string, number> = { membro: 1, manual: 2, condominio: 3 };
const ordenarLancamentos = (lista: any[]) =>
  [...lista].sort((a, b) => {
    const oa = ORDEM_ORIGEM[a.origem] ?? 99;
    const ob = ORDEM_ORIGEM[b.origem] ?? 99;
    if (oa !== ob) return oa - ob;
    return (b.data_lancamento || "").localeCompare(a.data_lancamento || "");
  });

export function MissoesRelatorioTab({ mesRef, cotacao }: Props) {
  const emptyLancFiltros = { data: [] as string[], origem: [] as string[], nome: [] as string[], valor: [] as string[] };
  const emptyDespFiltros = { data: [] as string[], categoria: [] as string[], descricao: [] as string[], valor: [] as string[] };
  const [lancFiltros, setLancFiltros] = useState(emptyLancFiltros);
  const [despFiltros, setDespFiltros] = useState(emptyDespFiltros);
  const { data: contribuintes = [] } = useQuery({
    queryKey: ["mm-rel-contrib"],
    queryFn: async () => {
      const { data } = await supabase
        .from("missoes_mocambique_contribuintes")
        .select("*, member:members(full_name)")
        .eq("ativo", true);
      return data || [];
    },
  });

  const { data: contribuicoes = [] } = useQuery({
    queryKey: ["mm-rel-contribuicoes", mesRef],
    queryFn: async () => {
      const { data } = await supabase
        .from("missoes_mocambique_contribuicoes")
        .select("*")
        .eq("mes_referencia", mesRef);
      return data || [];
    },
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ["mm-rel-lancamentos", mesRef],
    queryFn: async () => {
      const { data } = await supabase
        .from("missoes_mocambique_lancamentos")
        .select("*, member:members(full_name), condominio:condominios(name)")
        .eq("mes_referencia", mesRef)
        .order("data_lancamento");
      return data || [];
    },
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["mm-rel-despesas", mesRef],
    queryFn: async () => {
      const { data } = await supabase
        .from("missoes_mocambique_despesas")
        .select("*")
        .eq("mes_referencia", mesRef)
        .order("data_despesa");
      return data || [];
    },
  });

  const totaisCalc = useMemo(() => {
    const totalFixos = contribuicoes.filter((c: any) => c.pago).reduce((s: number, c: any) => s + Number(c.valor || 0), 0);
    const totalMembros = lancamentos.filter((l: any) => l.origem === "membro").reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
    const totalCond = lancamentos.filter((l: any) => l.origem === "condominio").reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
    const totalManual = lancamentos.filter((l: any) => l.origem === "manual").reduce((s: number, l: any) => s + Number(l.valor || 0), 0);
    const totalArrecadado = totalFixos + totalMembros + totalCond + totalManual;
    const totalDespesas = despesas.reduce((s: number, d: any) => s + Number(d.valor || 0), 0);
    const saldo = totalArrecadado - totalDespesas;
    return { totalFixos, totalMembros, totalCond, totalManual, totalArrecadado, totalDespesas, saldo };
  }, [contribuicoes, lancamentos, despesas]);

  const mesLabel = format(parseLocalDate(mesRef), "MMMM 'de' yyyy", { locale: ptBR });

  const totalMZN = totaisCalc.totalArrecadado * cotacao;
  const fmtMZN = (v: number) => `MZN ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtQtd = (v: number) =>
    v >= 100 ? v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
             : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  const getNomeContrib = (c: any) => c.member?.full_name || c.nome_manual || "Sem nome";
  const pagoMap = new Map(contribuicoes.map((c: any) => [c.contribuinte_id, c]));

  const lancRow = (l: any) => ({
    data: format(parseLocalDate(l.data_lancamento), "dd/MM/yyyy"),
    origem: String(l.origem || ""),
    nome: l.member?.full_name || l.condominio?.name || l.nome_manual || "—",
    valor: formatCurrency(Number(l.valor || 0)),
  });
  const despRow = (d: any) => ({
    data: format(parseLocalDate(d.data_despesa), "dd/MM/yyyy"),
    categoria: String(d.categoria || ""),
    descricao: d.descricao || "—",
    valor: formatCurrency(Number(d.valor || 0)),
  });
  const m = (sel: string[], v: string) => sel.length === 0 || sel.includes(v);
  const lancamentosOrd = ordenarLancamentos(lancamentos);
  const lancamentosFiltrados = lancamentosOrd.filter((l: any) => {
    const v = lancRow(l);
    return m(lancFiltros.data, v.data) && m(lancFiltros.origem, v.origem) && m(lancFiltros.nome, v.nome) && m(lancFiltros.valor, v.valor);
  });
  const despesasFiltradas = (despesas as any[]).filter((d: any) => {
    const v = despRow(d);
    return m(despFiltros.data, v.data) && m(despFiltros.categoria, v.categoria) && m(despFiltros.descricao, v.descricao) && m(despFiltros.valor, v.valor);
  });
  const lancOpcoes = {
    data: lancamentosOrd.map((l: any) => lancRow(l).data),
    origem: lancamentosOrd.map((l: any) => lancRow(l).origem),
    nome: lancamentosOrd.map((l: any) => lancRow(l).nome),
    valor: lancamentosOrd.map((l: any) => lancRow(l).valor),
  };
  const despOpcoes = {
    data: (despesas as any[]).map((d: any) => despRow(d).data),
    categoria: (despesas as any[]).map((d: any) => despRow(d).categoria),
    descricao: (despesas as any[]).map((d: any) => despRow(d).descricao),
    valor: (despesas as any[]).map((d: any) => despRow(d).valor),
  };
  const lancAtivo = Object.values(lancFiltros).some((a) => a.length > 0);
  const despAtivo = Object.values(despFiltros).some((a) => a.length > 0);

  const handlePDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setFontSize(16);
    doc.text(`Relatório Missões Moçambique — ${mesLabel}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 25);

    let y = 32;
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text("Resumo", 14, y); y += 5;
    const resumo = [
      ["Lançamentos de membros", formatCurrency(totaisCalc.totalMembros)],
      ["Lançamentos manuais", formatCurrency(totaisCalc.totalManual)],
      ["Ofertas de condomínios", formatCurrency(totaisCalc.totalCond)],
      ["TOTAL ARRECADADO (R$)", formatCurrency(totaisCalc.totalArrecadado)],
      ["Total de despesas (R$)", formatCurrency(totaisCalc.totalDespesas)],
      ["SALDO FINAL (R$)", formatCurrency(totaisCalc.saldo)],
    ];
    autoTable(doc, {
      startY: y, body: resumo, styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
      theme: "plain",
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Lançamentos
    const lancamentosOrdenados = ordenarLancamentos(lancamentos);
    if (lancamentosOrdenados.length > 0) {
      if (y > 240) { doc.addPage(); y = 18; }
      doc.setFontSize(11); doc.text("Lançamentos", 14, y); y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Data", "Origem", "Nome", "Forma", "Valor"]],
        body: lancamentosOrdenados.map((l: any) => [
          format(parseLocalDate(l.data_lancamento), "dd/MM"),
          l.origem,
          l.member?.full_name || l.condominio?.name || l.nome_manual || "—",
          l.forma_pagamento || "—",
          formatCurrency(Number(l.valor || 0)),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 53, 69] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Despesas
    if (despesas.length > 0) {
      if (y > 240) { doc.addPage(); y = 18; }
      doc.setFontSize(11); doc.text("Despesas do mês", 14, y); y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Data", "Categoria", "Descrição", "Forma", "Valor"]],
        body: despesas.map((d: any) => [
          format(parseLocalDate(d.data_despesa), "dd/MM"),
          d.categoria,
          d.descricao || "—",
          d.forma_pagamento || "—",
          formatCurrency(Number(d.valor || 0)),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 53, 69] },
      });
    }

    savePDF(doc, `Relatorio_Missoes_${mesRef.slice(0, 7)}.pdf`);
  };

  const handleExcel = async () => {
    const rows: any[] = [];
    ordenarLancamentos(lancamentos).forEach((l: any) => {
      rows.push({
        secao: `Lançamento (${l.origem})`,
        nome: l.member?.full_name || l.condominio?.name || l.nome_manual || "—",
        valor: Number(l.valor || 0),
        info: `${format(parseLocalDate(l.data_lancamento), "dd/MM/yyyy")} · ${l.forma_pagamento || "—"}`,
      });
    });
    despesas.forEach((d: any) => {
      rows.push({
        secao: "Despesa",
        nome: `${d.categoria} - ${d.descricao || ""}`,
        valor: -Number(d.valor || 0),
        info: `${format(parseLocalDate(d.data_despesa), "dd/MM/yyyy")} · ${d.forma_pagamento || "—"}`,
      });
    });
    await exportGenericToExcel(
      rows,
      [
        { header: "Seção", accessor: (r: any) => r.secao },
        { header: "Nome / Descrição", accessor: (r: any) => r.nome },
        { header: "Valor (R$)", accessor: (r: any) => r.valor, type: "currency" as const },
        { header: "Detalhes", accessor: (r: any) => r.info },
      ],
      `Relatorio_Missoes_${mesRef.slice(0, 7)}`,
      "Relatório",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Relatório de {mesLabel}</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcel}><FileSpreadsheet className="w-4 h-4 mr-1" />Excel</Button>
          <Button onClick={handlePDF}><FileText className="w-4 h-4 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Arrecadado (R$)</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold text-green-600">{formatCurrency(totaisCalc.totalArrecadado)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Em Meticais</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold text-blue-600">MZN {(totaisCalc.totalArrecadado * cotacao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Despesas</CardTitle></CardHeader>
          <CardContent className="text-xl font-bold text-destructive">{formatCurrency(totaisCalc.totalDespesas)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent className={`text-xl font-bold ${totaisCalc.saldo >= 0 ? "text-green-700" : "text-destructive"}`}>{formatCurrency(totaisCalc.saldo)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos do mês</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><ColumnFilter label="Data" options={lancOpcoes.data} selected={lancFiltros.data} onChange={(v) => setLancFiltros({ ...lancFiltros, data: v })} /></TableHead>
                <TableHead><ColumnFilter label="Origem" options={lancOpcoes.origem} selected={lancFiltros.origem} onChange={(v) => setLancFiltros({ ...lancFiltros, origem: v })} /></TableHead>
                <TableHead><ColumnFilter label="Nome" options={lancOpcoes.nome} selected={lancFiltros.nome} onChange={(v) => setLancFiltros({ ...lancFiltros, nome: v })} /></TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ColumnFilter label="Valor" options={lancOpcoes.valor} selected={lancFiltros.valor} onChange={(v) => setLancFiltros({ ...lancFiltros, valor: v })} align="end" />
                    {lancAtivo && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLancFiltros(emptyLancFiltros)} aria-label="Limpar filtros">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">{lancAtivo ? "Nenhum lançamento para os filtros aplicados." : "Nenhum lançamento."}</TableCell></TableRow>
              ) : lancamentosFiltrados.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{format(parseLocalDate(l.data_lancamento), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant="outline">{l.origem}</Badge></TableCell>
                  <TableCell>{l.member?.full_name || l.condominio?.name || l.nome_manual || "—"}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(Number(l.valor || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Despesas do mês</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><ColumnFilter label="Data" options={despOpcoes.data} selected={despFiltros.data} onChange={(v) => setDespFiltros({ ...despFiltros, data: v })} /></TableHead>
                <TableHead><ColumnFilter label="Categoria" options={despOpcoes.categoria} selected={despFiltros.categoria} onChange={(v) => setDespFiltros({ ...despFiltros, categoria: v })} /></TableHead>
                <TableHead><ColumnFilter label="Descrição" options={despOpcoes.descricao} selected={despFiltros.descricao} onChange={(v) => setDespFiltros({ ...despFiltros, descricao: v })} /></TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ColumnFilter label="Valor" options={despOpcoes.valor} selected={despFiltros.valor} onChange={(v) => setDespFiltros({ ...despFiltros, valor: v })} align="end" />
                    {despAtivo && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDespFiltros(emptyDespFiltros)} aria-label="Limpar filtros">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">{despAtivo ? "Nenhuma despesa para os filtros aplicados." : "Nenhuma despesa."}</TableCell></TableRow>
              ) : despesasFiltradas.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{format(parseLocalDate(d.data_despesa), "dd/MM/yyyy")}</TableCell>
                  <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                  <TableCell>{d.descricao || "—"}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(Number(d.valor || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}