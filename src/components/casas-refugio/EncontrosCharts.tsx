import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";

interface Encontro {
  id: string;
  data_encontro: string;
  qtd_lideres: number | null;
  qtd_membros: number | null;
  qtd_criancas: number | null;
  qtd_visitantes: number | null;
  kilos_arrecadados: number | null;
  ofertas: number | null;
}

interface EncontrosChartsProps {
  encontros: Encontro[];
}

export const EncontrosCharts = ({ encontros }: EncontrosChartsProps) => {
  const chartData = useMemo(() => {
    // Group by month
    const grouped = encontros.reduce((acc, encontro) => {
      const date = parseLocalDate(encontro.data_encontro);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM/yy", { locale: ptBR });

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthLabel,
          sortKey: monthKey,
          lideres: 0,
          membros: 0,
          criancas: 0,
          visitantes: 0,
          total: 0,
          kilos: 0,
          ofertas: 0,
          encontros: 0,
        };
      }

      acc[monthKey].lideres += encontro.qtd_lideres || 0;
      acc[monthKey].membros += encontro.qtd_membros || 0;
      acc[monthKey].criancas += encontro.qtd_criancas || 0;
      acc[monthKey].visitantes += encontro.qtd_visitantes || 0;
      acc[monthKey].total +=
        (encontro.qtd_lideres || 0) +
        (encontro.qtd_membros || 0) +
        (encontro.qtd_criancas || 0) +
        (encontro.qtd_visitantes || 0);
      acc[monthKey].kilos += Number(encontro.kilos_arrecadados || 0);
      acc[monthKey].ofertas += Number(encontro.ofertas || 0);
      acc[monthKey].encontros += 1;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12); // Last 12 months
  }, [encontros]);

  if (encontros.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Participantes por Mês */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Participantes por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="lideres" name="Líderes" fill="#3b82f6" stackId="a" />
                <Bar dataKey="membros" name="Membros" fill="#22c55e" stackId="a" />
                <Bar dataKey="criancas" name="Crianças" fill="#f59e0b" stackId="a" />
                <Bar dataKey="visitantes" name="Visitantes" fill="#a855f7" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Evolução Total */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Evolução de Participantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--destructive))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Kilos e Ofertas */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Kilos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="kilos" name="Kilos" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Ofertas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Ofertas"]}
                  />
                  <Bar dataKey="ofertas" name="Ofertas" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
