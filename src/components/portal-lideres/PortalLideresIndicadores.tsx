import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalAccess } from "@/hooks/useMemberPortal";
import {
  Users,
  Home,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  Loader2,
  BarChart3,
} from "lucide-react";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface PortalLideresIndicadoresProps {
  portalAccess: PortalAccess | null;
}

export const PortalLideresIndicadores = ({
  portalAccess,
}: PortalLideresIndicadoresProps) => {
  const currentMonth = new Date();
  const startMonth = startOfMonth(currentMonth);
  const endMonth = endOfMonth(currentMonth);

  // Buscar estatísticas gerais da igreja
  const { data: stats, isLoading } = useQuery({
    queryKey: ["portal-lideres-indicadores"],
    queryFn: async () => {
      // Total de membros
      const { count: totalMembros } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true });

      // Total de casas refúgio
      const { count: totalCasas } = await supabase
        .from("casas_refugio")
        .select("*", { count: "exact", head: true });

      // Total de ministérios
      const { count: totalMinisterios } = await supabase
        .from("ministries")
        .select("*", { count: "exact", head: true });

      // Encontros do mês atual
      const { data: encontrosMes } = await supabase
        .from("encontros_casa_refugio")
        .select("*")
        .gte("data_encontro", format(startMonth, "yyyy-MM-dd"))
        .lte("data_encontro", format(endMonth, "yyyy-MM-dd"));

      // Novos convertidos do mês
      const { count: novosConvertidos } = await supabase
        .from("novos_convertidos")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startMonth.toISOString())
        .lte("created_at", endMonth.toISOString());

      // Calcular totais dos encontros
      const totalEncontros = encontrosMes?.length || 0;
      const totalPessoas = encontrosMes?.reduce(
        (acc, e) =>
          acc +
          (e.qtd_lideres || 0) +
          (e.qtd_membros || 0) +
          (e.qtd_criancas || 0) +
          (e.qtd_visitantes || 0),
        0
      ) || 0;
      const totalKilos = encontrosMes?.reduce(
        (acc, e) => acc + Number(e.kilos_arrecadados || 0),
        0
      ) || 0;
      const totalOfertas = encontrosMes?.reduce(
        (acc, e) => acc + Number(e.ofertas || 0),
        0
      ) || 0;

      return {
        totalMembros: totalMembros || 0,
        totalCasas: totalCasas || 0,
        totalMinisterios: totalMinisterios || 0,
        totalEncontros,
        totalPessoas,
        totalKilos,
        totalOfertas,
        novosConvertidos: novosConvertidos || 0,
        mediaPorEncontro: totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0,
      };
    },
  });

  // Buscar dados históricos para gráficos (últimos 6 meses)
  const { data: historicoEncontros = [] } = useQuery({
    queryKey: ["portal-lideres-historico"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data } = await supabase
        .from("encontros_casa_refugio")
        .select("data_encontro, qtd_lideres, qtd_membros, qtd_criancas, qtd_visitantes, ofertas, kilos_arrecadados")
        .gte("data_encontro", format(sixMonthsAgo, "yyyy-MM-dd"))
        .order("data_encontro");

      // Agrupar por mês
      const porMes: Record<string, { pessoas: number; ofertas: number; encontros: number }> = {};
      
      data?.forEach((e) => {
        const mes = format(parseISO(e.data_encontro), "MMM/yy", { locale: ptBR });
        if (!porMes[mes]) {
          porMes[mes] = { pessoas: 0, ofertas: 0, encontros: 0 };
        }
        porMes[mes].pessoas +=
          (e.qtd_lideres || 0) +
          (e.qtd_membros || 0) +
          (e.qtd_criancas || 0) +
          (e.qtd_visitantes || 0);
        porMes[mes].ofertas += Number(e.ofertas || 0);
        porMes[mes].encontros += 1;
      });

      return Object.entries(porMes).map(([mes, dados]) => ({
        mes,
        ...dados,
        media: dados.encontros > 0 ? Math.round(dados.pessoas / dados.encontros) : 0,
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl">Indicadores</h2>
        <p className="text-sm text-muted-foreground">
          Visão geral do mês de {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats?.totalMembros}</p>
            <p className="text-xs text-muted-foreground">Membros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Home className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats?.totalCasas}</p>
            <p className="text-xs text-muted-foreground">Casas Refúgio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{stats?.totalEncontros}</p>
            <p className="text-xs text-muted-foreground">Encontros/Mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{stats?.novosConvertidos}</p>
            <p className="text-xs text-muted-foreground">Novos/Mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Encontros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats?.totalPessoas}</p>
            <p className="text-xs text-muted-foreground">Pessoas/Mês</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.mediaPorEncontro}</p>
            <p className="text-xs text-muted-foreground">Média/Encontro</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats?.totalKilos} kg</p>
            <p className="text-xs text-muted-foreground">Kilos/Mês</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              R$ {stats?.totalOfertas?.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">Ofertas/Mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      {historicoEncontros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Evolução (Últimos 6 Meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicoEncontros}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="pessoas" fill="hsl(var(--secondary))" name="Total Pessoas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Média por Encontro */}
      {historicoEncontros.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Média por Encontro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicoEncontros}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="media"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--secondary))" }}
                    name="Média"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
