import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HandHeart, Heart, CheckCircle, Clock, UserX, User, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--muted))"];

const IntercessaoIndicadoresTab = () => {
  const { data: pedidos, isLoading: loadingPedidos } = useQuery({
    queryKey: ["pedidos-oracao-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos_oracao")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: testemunhos, isLoading: loadingTestemunhos } = useQuery({
    queryKey: ["testemunhos-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testemunhos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loadingPedidos || loadingTestemunhos) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const now = new Date();
  
  // Pedidos stats
  const totalPedidos = pedidos?.length || 0;
  const pedidosAbertos = pedidos?.filter((p) => p.status === "aberto").length || 0;
  const pedidosRespondidos = pedidos?.filter((p) => p.status === "respondido").length || 0;
  const pedidosAnonimos = pedidos?.filter((p) => p.anonimo).length || 0;
  const taxaResposta = totalPedidos > 0 ? Math.round((pedidosRespondidos / totalPedidos) * 100) : 0;

  // Testemunhos stats
  const totalTestemunhos = testemunhos?.length || 0;
  const testemunhosAprovados = testemunhos?.filter((t) => t.aprovado).length || 0;
  const testemunhosPendentes = testemunhos?.filter((t) => !t.aprovado).length || 0;
  const testemunhosAtivos = testemunhos?.filter((t) => {
    if (!t.aprovado || t.arquivado) return false;
    const daysSince = differenceInDays(now, new Date(t.created_at));
    return daysSince <= 15;
  }).length || 0;

  // Monthly data for chart (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    
    const pedidosMes = pedidos?.filter((p) => {
      const date = new Date(p.created_at);
      return date >= start && date <= end;
    }).length || 0;

    const testemunhosMes = testemunhos?.filter((t) => {
      const date = new Date(t.created_at);
      return date >= start && date <= end;
    }).length || 0;

    monthlyData.push({
      name: format(monthDate, "MMM", { locale: ptBR }),
      pedidos: pedidosMes,
      testemunhos: testemunhosMes,
    });
  }

  // Status distribution for pie chart
  const statusData = [
    { name: "Abertos", value: pedidosAbertos },
    { name: "Respondidos", value: pedidosRespondidos },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading font-bold">Indicadores de Intercessão</h2>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <HandHeart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              {pedidosAnonimos} anônimos ({totalPedidos > 0 ? Math.round((pedidosAnonimos / totalPedidos) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaResposta}%</div>
            <p className="text-xs text-muted-foreground">
              {pedidosRespondidos} respondidos de {totalPedidos}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Testemunhos</CardTitle>
            <Heart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTestemunhos}</div>
            <p className="text-xs text-muted-foreground">
              {testemunhosAprovados} aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Testemunhos Ativos</CardTitle>
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{testemunhosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              {testemunhosPendentes} pendentes de aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos e Testemunhos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pedidos" name="Pedidos" fill="hsl(var(--primary))" />
                  <Bar dataKey="testemunhos" name="Testemunhos" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pedidosAbertos}</p>
                <p className="text-sm text-muted-foreground">Pedidos Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pedidosRespondidos}</p>
                <p className="text-sm text-muted-foreground">Orações Respondidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/10">
                <UserX className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pedidosAnonimos}</p>
                <p className="text-sm text-muted-foreground">Pedidos Anônimos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntercessaoIndicadoresTab;
