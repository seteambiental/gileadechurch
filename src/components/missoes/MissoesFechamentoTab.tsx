import { useState } from "react";
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
// Mesmos itens do Relatório (salários + materiais de construção)
const REFERENCIAS_PODER_COMPRA: { item: string; valor_mzn: number; emoji: string; unidade: string }[] = [
  // Salários / sustento mensal
  { item: "Salário mínimo nacional", valor_mzn: 5000, emoji: "💵", unidade: "meses" },
  { item: "Trabalhador rural / agricultura", valor_mzn: 5500, emoji: "🌾", unidade: "meses" },
  { item: "Empregada doméstica", valor_mzn: 7000, emoji: "🧺", unidade: "meses" },
  { item: "Pedreiro / servente de obra", valor_mzn: 15000, emoji: "👷", unidade: "meses" },
  { item: "Professor do ensino primário", valor_mzn: 20000, emoji: "👩‍🏫", unidade: "meses" },
  { item: "Enfermeiro", valor_mzn: 25000, emoji: "🩺", unidade: "meses" },
  { item: "Pastor local (apoio mensal)", valor_mzn: 12000, emoji: "⛪", unidade: "meses" },
  { item: "Cesta básica familiar (mês)", valor_mzn: 8000, emoji: "🛒", unidade: "cestas" },
  // Materiais de construção
  { item: "Saco de cimento 50 kg", valor_mzn: 650, emoji: "🧱", unidade: "sacos" },
  { item: "Bloco de cimento 15 cm", valor_mzn: 25, emoji: "🟪", unidade: "unid." },
  { item: "Tijolo queimado", valor_mzn: 10, emoji: "🧱", unidade: "unid." },
  { item: "Chapa de zinco 3 m", valor_mzn: 900, emoji: "🏠", unidade: "chapas" },
  { item: "Telha lusa", valor_mzn: 35, emoji: "🏚️", unidade: "unid." },
  { item: "Vergalhão de ferro 12 mm (12 m)", valor_mzn: 750, emoji: "🔩", unidade: "barras" },
  { item: "Areia para construção", valor_mzn: 1500, emoji: "⏳", unidade: "m³" },
  { item: "Brita / pedra britada", valor_mzn: 2500, emoji: "🪨", unidade: "m³" },
  { item: "Porta de madeira simples", valor_mzn: 3500, emoji: "🚪", unidade: "unid." },
  { item: "Janela de alumínio simples", valor_mzn: 4500, emoji: "🪟", unidade: "unid." },
  { item: "Bíblia em português", valor_mzn: 500, emoji: "📖", unidade: "exemplares" },
];

export function MissoesFechamentoTab() {
  const queryClient = useQueryClient();
  const [mesAtual] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [cotacaoInput, setCotacaoInput] = useState(String(DEFAULT_COTACAO));

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
                onChange={(e) => setCotacaoInput(e.target.value)}
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
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {REFERENCIAS_PODER_COMPRA.map((ref) => {
              const quantidade = Math.floor(totalMZN / ref.valor_mzn);
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
                      = {quantidade.toLocaleString("pt-BR")} unidades
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Contribuintes</TableHead>
                <TableHead>Total (R$)</TableHead>
                <TableHead>Cotação</TableHead>
                <TableHead>Total (MZN)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fechamentos?.map((f) => (
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
              {(!fechamentos || fechamentos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum fechamento realizado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
