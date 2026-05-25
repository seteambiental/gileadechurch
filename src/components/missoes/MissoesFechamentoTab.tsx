import { useState, useEffect } from "react";
import { todayDateStr } from "@/lib/date-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ColumnFilter } from "./ColumnFilter";
import { X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Cotação aproximada MZN (Metical Moçambicano) por Real
const DEFAULT_COTACAO = 10.5;

// Referências de poder de compra em Moçambique
// Mesmos itens do Relatório, agrupados por categoria
const REFERENCIAS_PODER_COMPRA: { item: string; valor_mzn: number; emoji: string; unidade: string; categoria: string }[] = [
  // Itens de alimentação (topo)
  // Cereais, Grãos e Mercearia Básica
  { categoria: "CESTA BÁSICA", item: "Arroz (saco 25 kg)", valor_mzn: 1825, emoji: "🍚", unidade: "sacos" },
  { categoria: "CESTA BÁSICA", item: "Farinha de milho (12,5 kg)", valor_mzn: 600, emoji: "🌽", unidade: "sacos" },
  { categoria: "CESTA BÁSICA", item: "Farinha de trigo (1 kg)", valor_mzn: 75, emoji: "🌾", unidade: "kg" },
  { categoria: "CESTA BÁSICA", item: "Feijão manteiga (1 kg)", valor_mzn: 110, emoji: "🫘", unidade: "kg" },
  { categoria: "CESTA BÁSICA", item: "Óleo alimentar (5 L)", valor_mzn: 750, emoji: "🛢️", unidade: "garrafas" },
  { categoria: "CESTA BÁSICA", item: "Açúcar (6 kg)", valor_mzn: 400, emoji: "🍬", unidade: "pacotes" },
  { categoria: "CESTA BÁSICA", item: "Massa esparguete (500 g)", valor_mzn: 45, emoji: "🍝", unidade: "pacotes" },
  { categoria: "CESTA BÁSICA", item: "Pão (carcaça)", valor_mzn: 12, emoji: "🥖", unidade: "unidades" },
  // Carnes e Proteínas
  { categoria: "CESTA BÁSICA", item: "Carne de vaca (1 kg)", valor_mzn: 562, emoji: "🥩", unidade: "kg" },
  { categoria: "CESTA BÁSICA", item: "Frango inteiro nacional (1,8 kg)", valor_mzn: 410, emoji: "🍗", unidade: "unidades" },
  { categoria: "CESTA BÁSICA", item: "Coxas de frango (pacote 2 kg)", valor_mzn: 450, emoji: "🍗", unidade: "pacotes" },
  { categoria: "CESTA BÁSICA", item: "Peixe carapau (1 kg)", valor_mzn: 165, emoji: "🐟", unidade: "kg" },
  { categoria: "CESTA BÁSICA", item: "Carne de porco (1 kg)", valor_mzn: 367, emoji: "🥓", unidade: "kg" },
  { categoria: "CESTA BÁSICA", item: "Ovos (dúzia)", valor_mzn: 120, emoji: "🥚", unidade: "dúzias" },
  // Hortofrutícolas
  { categoria: "CESTA BÁSICA", item: "Batata reno (saco 10 kg)", valor_mzn: 500, emoji: "🥔", unidade: "sacos" },
  { categoria: "CESTA BÁSICA", item: "Cebola (saco 10 kg)", valor_mzn: 450, emoji: "🧅", unidade: "sacos" },
  { categoria: "CESTA BÁSICA", item: "Tomate (1 kg)", valor_mzn: 70, emoji: "🍅", unidade: "kg" },
  { categoria: "CESTA BÁSICA", item: "Repolho (unidade)", valor_mzn: 50, emoji: "🥬", unidade: "unidades" },
  // Laticínios e Higiene
  { categoria: "CESTA BÁSICA", item: "Leite longa vida (1 L)", valor_mzn: 112, emoji: "🥛", unidade: "litros" },
  { categoria: "CESTA BÁSICA", item: "Manteiga / margarina (250 g)", valor_mzn: 95, emoji: "🧈", unidade: "unidades" },
  { categoria: "CESTA BÁSICA", item: "Sabão em barra", valor_mzn: 45, emoji: "🧼", unidade: "unidades" },
  // Salários / sustento mensal
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Salário mínimo nacional", valor_mzn: 5000, emoji: "💵", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Trabalhador rural / agricultura", valor_mzn: 5500, emoji: "🌾", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Empregada doméstica", valor_mzn: 7000, emoji: "🧺", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Pedreiro / servente de obra", valor_mzn: 15000, emoji: "👷", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Professor do ensino primário", valor_mzn: 20000, emoji: "👩‍🏫", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Enfermeiro", valor_mzn: 25000, emoji: "🩺", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Pastor local (apoio mensal)", valor_mzn: 12000, emoji: "⛪", unidade: "meses" },
  { categoria: "SALÁRIOS E SUSTENTO MENSAL", item: "Cesta básica familiar (mês)", valor_mzn: 8000, emoji: "🛒", unidade: "cestas" },
  // Materiais de construção
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Saco de cimento 50 kg", valor_mzn: 650, emoji: "🧱", unidade: "sacos" },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Bloco de cimento 15 cm", valor_mzn: 25, emoji: "🟪", unidade: "unid." },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Tijolo queimado", valor_mzn: 10, emoji: "🧱", unidade: "unid." },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Chapa de zinco 3 m", valor_mzn: 900, emoji: "🏠", unidade: "chapas" },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Telha lusa", valor_mzn: 35, emoji: "🏚️", unidade: "unid." },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Vergalhão de ferro 12 mm (12 m)", valor_mzn: 750, emoji: "🔩", unidade: "barras" },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Areia para construção", valor_mzn: 1500, emoji: "⏳", unidade: "m³" },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Brita / pedra britada", valor_mzn: 2500, emoji: "🪨", unidade: "m³" },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Porta de madeira simples", valor_mzn: 3500, emoji: "🚪", unidade: "unid." },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Janela de alumínio simples", valor_mzn: 4500, emoji: "🪟", unidade: "unid." },
  { categoria: "MATERIAIS DE CONSTRUÇÃO", item: "Bíblia em português", valor_mzn: 500, emoji: "📖", unidade: "exemplares" },
];

export function MissoesFechamentoTab() {
  const queryClient = useQueryClient();
  const [mesAtual] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [cotacaoInput, setCotacaoInput] = useState(String(DEFAULT_COTACAO));
  const [cotacaoTocada, setCotacaoTocada] = useState(false);
  const emptyHistFiltros = { mes: [] as string[], contribuintes: [] as string[], total: [] as string[], cotacao: [] as string[], totalMzn: [] as string[], status: [] as string[] };
  const [histFiltros, setHistFiltros] = useState(emptyHistFiltros);

  // Cotação automática BRL → MZN (mesma fonte das outras abas)
  const { data: cotacaoAuto } = useQuery({
    queryKey: ["mm-cotacao-auto"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("obter-cotacao-mzn");
      if (error) throw error;
      return data as { cotacao: number };
    },
    staleTime: 30 * 60 * 1000,
  });

  // Quando a cotação automática chega, atualiza o input (se o usuário não tiver editado manualmente)
  useEffect(() => {
    if (cotacaoAuto?.cotacao && !cotacaoTocada) {
      setCotacaoInput(String(cotacaoAuto.cotacao));
    }
  }, [cotacaoAuto?.cotacao, cotacaoTocada]);

  const { data: contribuintes } = useQuery({
    queryKey: ["missoes-contribuintes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_contribuintes")
        .select(`*, member:members(full_name)`)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: fechamentos } = useQuery({
    queryKey: ["missoes-fechamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_fechamentos")
        .select("*")
        .order("mes_referencia", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: contribuicoesMes } = useQuery({
    queryKey: ["missoes-contribuicoes", mesAtual],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("missoes_mocambique_contribuicoes")
        .select(`*, contribuinte:missoes_mocambique_contribuintes(*, member:members(full_name))`)
        .eq("mes_referencia", mesAtual);
      if (error) throw error;
      return data;
    },
  });

  const fecharMesMutation = useMutation({
    mutationFn: async () => {
      const totalArrecadado = contribuintes?.reduce((acc, c) => acc + Number(c.valor_mensal), 0) || 0;
      const cotacao = parseFloat(cotacaoInput) || DEFAULT_COTACAO;

      const { error } = await supabase
        .from("missoes_mocambique_fechamentos")
        .upsert({
          mes_referencia: mesAtual,
          total_arrecadado: totalArrecadado,
          total_contribuintes: contribuintes?.length || 0,
          cotacao_mzn: cotacao,
          valor_convertido_mzn: totalArrecadado * cotacao,
          fechado: true,
        }, { onConflict: "mes_referencia" });

      if (error) throw error;

      // Criar registros de contribuições para cada contribuinte
      const contribuicoesData = contribuintes?.map(c => ({
        contribuinte_id: c.id,
        mes_referencia: mesAtual,
        valor: c.valor_mensal,
        pago: true,
        data_pagamento: todayDateStr(),
      })) || [];

      if (contribuicoesData.length > 0) {
        const { error: contribError } = await supabase
          .from("missoes_mocambique_contribuicoes")
          .upsert(contribuicoesData, { 
            onConflict: "contribuinte_id,mes_referencia",
            ignoreDuplicates: true 
          });
        if (contribError) console.error(contribError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missoes-fechamentos"] });
      queryClient.invalidateQueries({ queryKey: ["missoes-contribuicoes"] });
      toast.success("Mês fechado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao fechar o mês");
    },
  });

  const totalMensal = contribuintes?.reduce((acc, c) => acc + Number(c.valor_mensal), 0) || 0;
  const cotacao = parseFloat(cotacaoInput) || DEFAULT_COTACAO;
  const totalMZN = totalMensal * cotacao;

  const chartData = fechamentos?.map(f => ({
    mes: format(new Date(f.mes_referencia), "MMM/yy", { locale: ptBR }),
    reais: Number(f.total_arrecadado),
    meticais: Number(f.valor_convertido_mzn),
  })).reverse() || [];

  const fechamentoAtual = fechamentos?.find(f => f.mes_referencia === mesAtual);

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mês Atual (R$)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotação MZN/BRL</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={cotacaoInput}
                onChange={(e) => { setCotacaoInput(e.target.value); setCotacaoTocada(true); }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">MZN</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Meticais</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              MZN {totalMZN.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Mês</CardTitle>
            {fechamentoAtual?.fechado ? (
              <Lock className="h-4 w-4 text-green-600" />
            ) : (
              <Unlock className="h-4 w-4 text-yellow-600" />
            )}
          </CardHeader>
          <CardContent>
            <Badge variant={fechamentoAtual?.fechado ? "default" : "secondary"}>
              {fechamentoAtual?.fechado ? "Fechado" : "Em aberto"}
            </Badge>
            {!fechamentoAtual?.fechado && (
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => fecharMesMutation.mutate()}
                disabled={fecharMesMutation.isPending}
              >
                Fechar Mês
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referências de poder de compra */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💰 Poder de Compra em Moçambique
          </CardTitle>
          <CardDescription>
            Veja o que R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} podem proporcionar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Impacto: Cesta Básica Família 4 pessoas */}
          {(() => {
            const CESTA_FAMILIA_4 = 34364;
            const SALARIO_MINIMO = 9261;
            const CESTA_OTM_5 = 42955;
            const cestasFamilia = totalMZN / CESTA_FAMILIA_4;
            const salarios = totalMZN / SALARIO_MINIMO;
            const blocos = [
              { label: "Cereais e Grãos Básicos", valor: 10500, desc: "Arroz, farinha de milho, feijão, açúcar, óleo — base de carboidratos (xima e arroz diário).", emoji: "🌾" },
              { label: "Proteínas e Carnes", valor: 13200, desc: "Frango, peixe carapau, carne de vaca e ovos — consumo regular ao longo do mês.", emoji: "🥩" },
              { label: "Hortofrutícolas", valor: 6800, desc: "Batata reno, cebola, tomate e repolho — compras semanais no atacado.", emoji: "🥬" },
              { label: "Laticínios, Pão e Higiene", valor: 3864, desc: "Leite, manteiga, pão diário e sabão em barra.", emoji: "🥛" },
            ];
            return (
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-bold tracking-wider text-primary mb-1">
                    🍽️ CESTA BÁSICA — FAMÍLIA DE 4 PESSOAS
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    O custo total estimado de uma cesta básica para uma família de 4 pessoas em Moçambique é de aproximadamente{" "}
                    <strong>MZN {CESTA_FAMILIA_4.toLocaleString("pt-BR")}</strong>. Esse valor é proporcional à estimativa oficial da
                    Organização dos Trabalhadores Moçambicanos (OTM-CS), que fixa o custo em{" "}
                    <strong>MZN {CESTA_OTM_5.toLocaleString("pt-BR")}</strong> para um agregado de 5 pessoas.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md bg-background p-3 border">
                    <p className="text-xs text-muted-foreground">Com este envio é possível custear</p>
                    <p className="text-2xl font-bold text-primary">
                      {cestasFamilia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cestas
                    </p>
                    <p className="text-xs text-muted-foreground">para uma família de 4 pessoas</p>
                  </div>
                  <div className="rounded-md bg-background p-3 border">
                    <p className="text-xs text-muted-foreground">Equivale a</p>
                    <p className="text-2xl font-bold text-primary">
                      {salarios.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} salários mínimos
                    </p>
                    <p className="text-xs text-muted-foreground">médio nacional MZN {SALARIO_MINIMO.toLocaleString("pt-BR")}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Divisão Estimada de Gastos Mensais (Família de 4 pessoas)
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {blocos.map((b) => {
                      const pct = ((b.valor / CESTA_FAMILIA_4) * 100).toFixed(1);
                      return (
                        <div key={b.label} className="flex gap-3 p-3 bg-background rounded-md border">
                          <span className="text-2xl">{b.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="font-medium text-sm">{b.label}</p>
                              <p className="text-sm font-bold text-primary whitespace-nowrap">
                                MZN {b.valor.toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">{b.desc}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{pct}% da cesta</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs italic text-muted-foreground border-t pt-3">
                  <strong>Realidade do custo de vida:</strong> com salário mínimo médio em torno de MZN{" "}
                  {SALARIO_MINIMO.toLocaleString("pt-BR")}, uma família de 4 pessoas precisa de quase 4 salários
                  inteiros só para cobrir alimentação e higiene básica — sem contar transporte (chapas), energia
                  (Credelec), água e habitação.
                </p>
              </div>
            );
          })()}

          {Array.from(new Set(REFERENCIAS_PODER_COMPRA.map((r) => r.categoria))).map((cat, idx) => (
            <div key={cat}>
              {idx > 0 && <div className="border-t mb-4" />}
              <h4 className="text-xs font-bold tracking-wider text-muted-foreground mb-3">
                {cat}
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                {REFERENCIAS_PODER_COMPRA.filter((r) => r.categoria === cat).map((ref) => {
                  const bruto = ref.valor_mzn > 0 ? totalMZN / ref.valor_mzn : 0;
                  const quantidade = bruto >= 100
                    ? bruto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
                    : bruto.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
                  return (
                    <div
                      key={ref.item}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-2xl">{ref.emoji}</span>
                      <div>
                        <p className="font-medium">{ref.item}</p>
                        <p className="text-sm text-muted-foreground">
                          MZN {ref.valor_mzn} cada
                        </p>
                        <p className="text-lg font-bold text-primary">
                          = {quantidade} {ref.unidade}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Gráfico de evolução */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolução das Contribuições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis yAxisId="left" orientation="left" stroke="#22c55e" />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "reais"
                        ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        : `MZN ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                      name === "reais" ? "Reais" : "Meticais",
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="reais" name="Reais (R$)" fill="#22c55e" />
                  <Bar yAxisId="right" dataKey="meticais" name="Meticais (MZN)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de fechamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Fechamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(() => {
            const rowVals = (f: any) => ({
              mes: format(new Date(f.mes_referencia), "MMMM/yyyy", { locale: ptBR }),
              contribuintes: String(f.total_contribuintes ?? ""),
              total: `R$ ${Number(f.total_arrecadado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
              cotacao: Number(f.cotacao_mzn).toFixed(2),
              totalMzn: `MZN ${Number(f.valor_convertido_mzn).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
              status: f.fechado ? "Fechado" : "Aberto",
            });
            const m = (sel: string[], v: string) => sel.length === 0 || sel.includes(v);
            const filtrados = (fechamentos || []).filter((f: any) => {
              const v = rowVals(f);
              return m(histFiltros.mes, v.mes) && m(histFiltros.contribuintes, v.contribuintes) && m(histFiltros.total, v.total) && m(histFiltros.cotacao, v.cotacao) && m(histFiltros.totalMzn, v.totalMzn) && m(histFiltros.status, v.status);
            });
            const opcs = {
              mes: (fechamentos || []).map((f: any) => rowVals(f).mes),
              contribuintes: (fechamentos || []).map((f: any) => rowVals(f).contribuintes),
              total: (fechamentos || []).map((f: any) => rowVals(f).total),
              cotacao: (fechamentos || []).map((f: any) => rowVals(f).cotacao),
              totalMzn: (fechamentos || []).map((f: any) => rowVals(f).totalMzn),
              status: (fechamentos || []).map((f: any) => rowVals(f).status),
            };
            const algum = Object.values(histFiltros).some((a) => a.length > 0);
            return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><ColumnFilter label="Mês" options={opcs.mes} selected={histFiltros.mes} onChange={(v) => setHistFiltros({ ...histFiltros, mes: v })} /></TableHead>
                <TableHead><ColumnFilter label="Contribuintes" options={opcs.contribuintes} selected={histFiltros.contribuintes} onChange={(v) => setHistFiltros({ ...histFiltros, contribuintes: v })} /></TableHead>
                <TableHead><ColumnFilter label="Total (R$)" options={opcs.total} selected={histFiltros.total} onChange={(v) => setHistFiltros({ ...histFiltros, total: v })} /></TableHead>
                <TableHead><ColumnFilter label="Cotação" options={opcs.cotacao} selected={histFiltros.cotacao} onChange={(v) => setHistFiltros({ ...histFiltros, cotacao: v })} /></TableHead>
                <TableHead><ColumnFilter label="Total (MZN)" options={opcs.totalMzn} selected={histFiltros.totalMzn} onChange={(v) => setHistFiltros({ ...histFiltros, totalMzn: v })} /></TableHead>
                <TableHead>
                  <div className="flex items-center justify-between gap-2">
                    <ColumnFilter label="Status" options={opcs.status} selected={histFiltros.status} onChange={(v) => setHistFiltros({ ...histFiltros, status: v })} />
                    {algum && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setHistFiltros(emptyHistFiltros)} aria-label="Limpar filtros">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    {format(new Date(f.mes_referencia), "MMMM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{f.total_contribuintes}</TableCell>
                  <TableCell>
                    R$ {Number(f.total_arrecadado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{Number(f.cotacao_mzn).toFixed(2)}</TableCell>
                  <TableCell>
                    MZN {Number(f.valor_convertido_mzn).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.fechado ? "default" : "secondary"}>
                      {f.fechado ? "Fechado" : "Aberto"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {algum ? "Nenhum fechamento para os filtros aplicados." : "Nenhum fechamento realizado"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
