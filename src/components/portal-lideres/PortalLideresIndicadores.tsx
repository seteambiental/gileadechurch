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

  // Determinar quais casas refúgio o usuário pode ver
  const casasRefugioIds = portalAccess?.casasRefugioIds || [];
  const sindicoCondominios = portalAccess?.sindicoCondominios || [];
  const isFullAccess = portalAccess?.role === "pastor_geral" || portalAccess?.role === "pastor_auxiliar";
  const isSindico = portalAccess?.role === "sindico_condominio" && sindicoCondominios.length > 0;

  // Buscar casas refúgio do condomínio (para síndicos)
  const { data: casasDoCondominio = [] } = useQuery({
    queryKey: ["casas-condominio-indicadores", sindicoCondominios],
    queryFn: async () => {
      if (!sindicoCondominios.length) return [];
      
      // Buscar nomes dos condomínios
      const { data: condominios } = await supabase
        .from("condominios")
        .select("name")
        .in("id", sindicoCondominios);
      
      if (!condominios?.length) return [];
      
      const condominioNames = condominios.map(c => c.name);
      
      const { data: casas } = await supabase
        .from("casas_refugio")
        .select("id")
        .in("condominio", condominioNames);
      
      return casas?.map(c => c.id) || [];
    },
    enabled: isSindico,
  });

  // IDs finais das casas refúgio para filtrar
  const finalCasasIds = useMemo(() => {
    if (isFullAccess) return []; // Vazio significa todas
    if (portalAccess?.role === "sindico_condominio" && casasDoCondominio.length > 0) {
      return casasDoCondominio;
    }
    return casasRefugioIds;
  }, [isFullAccess, portalAccess?.role, casasDoCondominio, casasRefugioIds]);

  // Buscar estatísticas filtradas
  const { data: stats, isLoading } = useQuery({
    queryKey: ["portal-lideres-indicadores", finalCasasIds, isFullAccess],
    queryFn: async () => {
      // Total de casas refúgio (do usuário)
      let casasQuery = supabase.from("casas_refugio").select("*", { count: "exact", head: true });
      if (!isFullAccess && finalCasasIds.length > 0) {
        casasQuery = casasQuery.in("id", finalCasasIds);
      }
      const { count: totalCasas } = await casasQuery;

      // Membros vinculados às casas do usuário
      let membrosQuery = supabase.from("members").select("*", { count: "exact", head: true });
      if (!isFullAccess && finalCasasIds.length > 0) {
        membrosQuery = membrosQuery.in("casa_refugio_id", finalCasasIds);
      }
      const { count: totalMembros } = await membrosQuery;

      // Encontros do mês atual (apenas das casas do usuário)
      let encontrosQuery = supabase
        .from("encontros_casa_refugio")
        .select("*")
        .gte("data_encontro", format(startMonth, "yyyy-MM-dd"))
        .lte("data_encontro", format(endMonth, "yyyy-MM-dd"));
      
      if (!isFullAccess && finalCasasIds.length > 0) {
        encontrosQuery = encontrosQuery.in("casa_refugio_id", finalCasasIds);
      }
      const { data: encontrosMes } = await encontrosQuery;

      // Novos convertidos do mês (vinculados às casas do usuário)
      let ncQuery = supabase
        .from("novos_convertidos")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startMonth.toISOString())
        .lte("created_at", endMonth.toISOString());
      
      if (!isFullAccess && finalCasasIds.length > 0) {
        ncQuery = ncQuery.in("casa_refugio_id", finalCasasIds);
      }
      const { count: novosConvertidos } = await ncQuery;

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
    queryKey: ["portal-lideres-historico", finalCasasIds, isFullAccess],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      let query = supabase
        .from("encontros_casa_refugio")
        .select("data_encontro, qtd_lideres, qtd_membros, qtd_criancas, qtd_visitantes, ofertas, kilos_arrecadados")
        .gte("data_encontro", format(sixMonthsAgo, "yyyy-MM-dd"))
        .order("data_encontro");
      
      if (!isFullAccess && finalCasasIds.length > 0) {
        query = query.in("casa_refugio_id", finalCasasIds);
      }

      const { data } = await query;

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

  // Texto de contexto baseado no role
  const getContextLabel = () => {
    if (isFullAccess) return "todas as casas refúgio";
    if (portalAccess?.role === "sindico_condominio") return "casas do seu condomínio";
    if (portalAccess?.role === "supervisor_casa_refugio") return "suas casas supervisionadas";
    if (portalAccess?.role === "lider_casa_refugio") return "sua casa refúgio";
    return "suas casas refúgio";
  };

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
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })} • {getContextLabel()}
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
