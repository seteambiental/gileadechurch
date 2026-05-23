import { useMemo } from "react";
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
import { FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { savePDF, exportGenericToExcel } from "@/lib/export";

interface Props { mesRef: string; cotacao: number }

// Referências de preços médios em Moçambique (MZN). Valores aproximados 2024/2025.
const ALIMENTACAO_MZ: { item: string; valor: number; unidade: string }[] = [
  { item: "Refeição simples", valor: 150, unidade: "unid." },
  { item: "Transporte urbano (chapa)", valor: 20, unidade: "viagens" },
  { item: "1kg de arroz", valor: 80, unidade: "kg" },
  { item: "1kg de frango", valor: 250, unidade: "kg" },
  { item: "Água (20L)", valor: 30, unidade: "garrafões" },
  { item: "Bíblia impressa", valor: 500, unidade: "exemplares" },
];

const SALARIOS_MZ: { cargo: string; valor: number }[] = [
  { cargo: "Salário mínimo nacional", valor: 5000 },
  { cargo: "Trabalhador rural / agricultura", valor: 5500 },
  { cargo: "Empregada doméstica", valor: 7000 },
  { cargo: "Pedreiro / servente de obra", valor: 15000 },
  { cargo: "Professor do ensino primário", valor: 20000 },
  { cargo: "Enfermeiro", valor: 25000 },
  { cargo: "Pastor local (apoio mensal)", valor: 12000 },
  { cargo: "Cesta básica familiar (mês)", valor: 8000 },
];

const MATERIAIS_MZ: { item: string; valor: number; unidade: string }[] = [
  { item: "Saco de cimento 50 kg", valor: 650, unidade: "saco" },
  { item: "Bloco de cimento 15 cm", valor: 25, unidade: "unid." },
  { item: "Tijolo queimado", valor: 10, unidade: "unid." },
  { item: "Chapa de zinco 3 m", valor: 900, unidade: "chapa" },
  { item: "Telha lusa", valor: 35, unidade: "unid." },
  { item: "Vergalhão de ferro 12 mm (12 m)", valor: 750, unidade: "barra" },
  { item: "Areia para construção", valor: 1500, unidade: "m³" },
  { item: "Brita / pedra britada", valor: 2500, unidade: "m³" },
  { item: "Porta de madeira simples", valor: 3500, unidade: "unid." },
  { item: "Janela de alumínio simples", valor: 4500, unidade: "unid." },
  { item: "Bíblia em português", valor: 500, unidade: "exemplar" },
];

export function MissoesRelatorioTab({ mesRef, cotacao }: Props) {
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

  const mesLabel = format(new Date(mesRef), "MMMM 'de' yyyy", { locale: ptBR });

  const totalMZN = totaisCalc.totalArrecadado * cotacao;
  const fmtMZN = (v: number) => `MZN ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtQtd = (v: number) =>
    v >= 100 ? v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
             : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  const getNomeContrib = (c: any) => c.member?.full_name || c.nome_manual || "Sem nome";
  const pagoMap = new Map(contribuicoes.map((c: any) => [c.contribuinte_id, c]));

  const handlePDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setFontSize(16);
    doc.text(`Relatório Missões Moçambique — ${mesLabel}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 25);
    doc.text(`Cotação usada: 1 BRL = ${cotacao.toFixed(4)} MZN`, 14, 30);

    let y = 38;
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text("Resumo", 14, y); y += 5;
    const resumo = [
      ["Contribuições fixas (pagas)", formatCurrency(totaisCalc.totalFixos)],
      ["Lançamentos de membros", formatCurrency(totaisCalc.totalMembros)],
      ["Ofertas de condomínios", formatCurrency(totaisCalc.totalCond)],
      ["Lançamentos manuais", formatCurrency(totaisCalc.totalManual)],
      ["TOTAL ARRECADADO (R$)", formatCurrency(totaisCalc.totalArrecadado)],
      ["Equivalente em MZN", `MZN ${(totaisCalc.totalArrecadado * cotacao).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Total de despesas (R$)", formatCurrency(totaisCalc.totalDespesas)],
      ["SALDO FINAL (R$)", formatCurrency(totaisCalc.saldo)],
    ];
    autoTable(doc, {
      startY: y, body: resumo, styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
      theme: "plain",
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Contribuintes fixos
    doc.setFontSize(11); doc.text("Contribuintes fixos", 14, y); y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Nome", "Valor mensal (R$)", "Equiv. (MZN)", "Status do mês"]],
      body: contribuintes.map((c: any) => {
        const pago = pagoMap.get(c.id);
        const v = Number(c.valor_mensal || 0);
        return [getNomeContrib(c), formatCurrency(v), fmtMZN(v * cotacao), pago?.pago ? "Recebido" : "Pendente"];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Lançamentos
    if (lancamentos.length > 0) {
      if (y > 240) { doc.addPage(); y = 18; }
      doc.setFontSize(11); doc.text("Lançamentos avulsos", 14, y); y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Data", "Origem", "Nome", "Forma", "Valor"]],
        body: lancamentos.map((l: any) => [
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

    // Poder de compra
    if (y > 220) { doc.addPage(); y = 18; }
    doc.setFontSize(11); doc.text("Poder de compra em Moçambique", 14, y); y += 2;
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Com o total arrecadado (${fmtMZN(totalMZN)}) é possível custear:`, 14, y + 4);
    doc.setTextColor(0); y += 7;
    autoTable(doc, {
      startY: y,
      head: [["Ítens de alimentação", "Preço (MZN)", "Quantidade que dá para comprar"]],
      body: ALIMENTACAO_MZ.map((a) => [
        a.item,
        fmtMZN(a.valor),
        `${fmtQtd(totalMZN / a.valor)} ${a.unidade}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
    if (y > 240) { doc.addPage(); y = 18; }
    autoTable(doc, {
      startY: y,
      head: [["Salário / sustento mensal", "Valor (MZN)", "Quantos meses pode pagar"]],
      body: SALARIOS_MZ.map((s) => [
        s.cargo,
        fmtMZN(s.valor),
        `${fmtQtd(totalMZN / s.valor)} meses`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
    if (y > 240) { doc.addPage(); y = 18; }
    autoTable(doc, {
      startY: y,
      head: [["Material de construção", "Preço (MZN)", "Quantidade que dá para comprar"]],
      body: MATERIAIS_MZ.map((m) => [
        m.item,
        fmtMZN(m.valor),
        `${fmtQtd(totalMZN / m.valor)} ${m.unidade}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] },
    });

    savePDF(doc, `Relatorio_Missoes_${mesRef.slice(0, 7)}.pdf`);
  };

  const handleExcel = async () => {
    const rows: any[] = [];
    rows.push({ secao: "Contribuinte Fixo", nome: "", valor: "", info: "" });
    contribuintes.forEach((c: any) => {
      const pago = pagoMap.get(c.id);
      rows.push({
        secao: "Contribuinte Fixo",
        nome: getNomeContrib(c),
        valor: Number(c.valor_mensal || 0),
        info: pago?.pago ? "Recebido" : "Pendente",
      });
    });
    lancamentos.forEach((l: any) => {
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
        <CardHeader><CardTitle className="text-base">Contribuintes fixos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="text-right">Valor mensal (R$)</TableHead><TableHead className="text-right">Equiv. (MZN)</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {contribuintes.map((c: any) => {
                const pago = pagoMap.get(c.id);
                const v = Number(c.valor_mensal || 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>{getNomeContrib(c)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v)}</TableCell>
                    <TableCell className="text-right text-blue-600 text-sm">{cotacao > 0 ? fmtMZN(v * cotacao) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={pago?.pago ? "default" : "secondary"}>{pago?.pago ? "Recebido" : "Pendente"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos avulsos do mês</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Origem</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {lancamentos.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>
              ) : lancamentos.map((l: any) => (
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
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
            <TableBody>
              {despesas.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma despesa.</TableCell></TableRow>
              ) : despesas.map((d: any) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poder de compra em Moçambique</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Com o total arrecadado deste mês ({fmtMZN(totalMZN)}) é possível custear:
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-2">Ítens de alimentação</h4>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ALIMENTACAO_MZ.map((a) => (
                  <TableRow key={a.item}>
                    <TableCell className="text-sm">{a.item}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{fmtMZN(a.valor)}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      {totalMZN > 0 ? `${fmtQtd(totalMZN / a.valor)} ${a.unidade}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
          <div>
            <h4 className="text-sm font-semibold mb-2">Salários e sustento mensal</h4>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Cargo / referência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Meses</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {SALARIOS_MZ.map((s) => (
                  <TableRow key={s.cargo}>
                    <TableCell className="text-sm">{s.cargo}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{fmtMZN(s.valor)}</TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      {totalMZN > 0 ? `${fmtQtd(totalMZN / s.valor)} meses` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Materiais de construção</h4>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {MATERIAIS_MZ.map((m) => (
                  <TableRow key={m.item}>
                    <TableCell className="text-sm">{m.item}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{fmtMZN(m.valor)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">
                      {totalMZN > 0 ? `${fmtQtd(totalMZN / m.valor)} ${m.unidade}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-[11px] text-muted-foreground md:col-span-2">
            Valores médios de referência em Moçambique (2024/2025). Podem variar conforme região e câmbio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}