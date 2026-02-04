import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalAccess } from "@/hooks/useMemberPortal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Users,
  Home,
  Calendar,
  TrendingUp,
  Loader2,
  BarChart3,
  Filter,
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

  // Filtros
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("all");
  const [selectedCasa, setSelectedCasa] = useState<string>("all");

  // Determinar escopo de acesso
  const sindicoCondominios = portalAccess?.sindicoCondominios || [];
  const casasRefugioIds = portalAccess?.casasRefugioIds || [];
  const isFullAccess = portalAccess?.role === "pastor_geral" || portalAccess?.role === "pastor_auxiliar";
  const isSindico = sindicoCondominios.length > 0;

  // Buscar casas refúgio baseado no escopo do usuário
  const { data: casasDisponiveis = [], isLoading: loadingCasas } = useQuery({
    queryKey: ["indicadores-casas-disponiveis", sindicoCondominios, casasRefugioIds, isFullAccess],
    queryFn: async () => {
      let query = supabase
        .from("casas_refugio")
        .select(`
          id,
          name,
          condominio,
          supervisor_id,
          supervisor_esposa_id,
          supervisor:members!casas_refugio_supervisor_id_fkey(id, full_name),
          supervisor_esposa:members!casas_refugio_supervisor_esposa_id_fkey(id, full_name)
        `)
        .order("name");

      // Filtrar por condomínio se for síndico
      if (!isFullAccess && isSindico) {
        query = query.in("condominio", sindicoCondominios);
      } else if (!isFullAccess && casasRefugioIds.length > 0) {
        // Filtrar por IDs específicos se for líder/supervisor
        query = query.in("id", casasRefugioIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Extrair supervisores únicos das casas disponíveis
  const supervisoresDisponiveis = useMemo(() => {
    const supervisorMap = new Map<string, string>();
    
    casasDisponiveis.forEach((casa: any) => {
      if (casa.supervisor?.id && casa.supervisor?.full_name) {
        supervisorMap.set(casa.supervisor.id, casa.supervisor.full_name);
      }
      if (casa.supervisor_esposa?.id && casa.supervisor_esposa?.full_name) {
        supervisorMap.set(casa.supervisor_esposa.id, casa.supervisor_esposa.full_name);
      }
    });
    
    return Array.from(supervisorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [casasDisponiveis]);

  // Filtrar casas baseado nos filtros selecionados
  const casasFiltradas = useMemo(() => {
    let casas = casasDisponiveis;
    
    if (selectedSupervisor !== "all") {
      casas = casas.filter((casa: any) => 
        casa.supervisor_id === selectedSupervisor || 
        casa.supervisor_esposa_id === selectedSupervisor
      );
    }
    
    if (selectedCasa !== "all") {
      casas = casas.filter((casa: any) => casa.id === selectedCasa);
    }
    
    return casas;
  }, [casasDisponiveis, selectedSupervisor, selectedCasa]);

  // IDs finais das casas refúgio para filtrar estatísticas
  const finalCasasIds = useMemo(() => {
    return casasFiltradas.map((c: any) => c.id);
  }, [casasFiltradas]);

  // Buscar estatísticas filtradas
  const { data: stats, isLoading } = useQuery({
    queryKey: ["portal-lideres-indicadores", finalCasasIds],
    queryFn: async () => {
      // Total de casas refúgio (filtradas)
      const totalCasas = finalCasasIds.length;

      // Membros vinculados às casas filtradas
      let membrosCount = 0;
      if (finalCasasIds.length > 0) {
        const { count } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .in("casa_refugio_id", finalCasasIds);
        membrosCount = count || 0;
      }

      // Encontros do mês atual (apenas das casas filtradas)
      let encontrosMes: any[] = [];
      if (finalCasasIds.length > 0) {
        const { data } = await supabase
          .from("encontros_casa_refugio")
          .select("*")
          .in("casa_refugio_id", finalCasasIds)
          .gte("data_encontro", format(startMonth, "yyyy-MM-dd"))
          .lte("data_encontro", format(endMonth, "yyyy-MM-dd"));
        encontrosMes = data || [];
      }

      // Novos convertidos do mês (vinculados às casas filtradas)
      let novosConvertidosCount = 0;
      if (finalCasasIds.length > 0) {
        const { count } = await supabase
          .from("novos_convertidos")
          .select("*", { count: "exact", head: true })
          .in("casa_refugio_id", finalCasasIds)
          .gte("created_at", startMonth.toISOString())
          .lte("created_at", endMonth.toISOString());
        novosConvertidosCount = count || 0;
      }

      // Calcular totais dos encontros
      const totalEncontros = encontrosMes.length;
      const totalPessoas = encontrosMes.reduce(
        (acc, e) =>
          acc +
          (e.qtd_lideres || 0) +
          (e.qtd_membros || 0) +
          (e.qtd_criancas || 0) +
          (e.qtd_visitantes || 0),
        0
      );
      const totalKilos = encontrosMes.reduce(
        (acc, e) => acc + Number(e.kilos_arrecadados || 0),
        0
      );
      const totalOfertas = encontrosMes.reduce(
        (acc, e) => acc + Number(e.ofertas || 0),
        0
      );

      return {
        totalMembros: membrosCount,
        totalCasas,
        totalEncontros,
        totalPessoas,
        totalKilos,
        totalOfertas,
        novosConvertidos: novosConvertidosCount,
        mediaPorEncontro: totalEncontros > 0 ? Math.round(totalPessoas / totalEncontros) : 0,
      };
    },
    enabled: finalCasasIds.length > 0 || isFullAccess,
  });

  // Buscar dados históricos para gráficos (últimos 6 meses)
  const { data: historicoEncontros = [] } = useQuery({
    queryKey: ["portal-lideres-historico", finalCasasIds],
    queryFn: async () => {
      if (finalCasasIds.length === 0) return [];
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data } = await supabase
        .from("encontros_casa_refugio")
        .select("data_encontro, qtd_lideres, qtd_membros, qtd_criancas, qtd_visitantes, ofertas, kilos_arrecadados")
        .in("casa_refugio_id", finalCasasIds)
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
    enabled: finalCasasIds.length > 0,
  });

  // Texto de contexto baseado no role e filtros
  const getContextLabel = () => {
    if (selectedCasa !== "all") {
      const casa = casasDisponiveis.find((c: any) => c.id === selectedCasa);
      return casa?.name || "casa selecionada";
    }
    if (selectedSupervisor !== "all") {
      const sup = supervisoresDisponiveis.find(s => s.id === selectedSupervisor);
      return `supervisor ${sup?.name?.split(" ")[0] || ""}`;
    }
    if (isSindico) return sindicoCondominios.join(", ");
    if (isFullAccess) return "todas as casas refúgio";
    return "suas casas refúgio";
  };

  // Reset filtro de casa quando mudar supervisor
  const handleSupervisorChange = (value: string) => {
    setSelectedSupervisor(value);
    setSelectedCasa("all");
  };

  // Casas disponíveis para o filtro (baseado no supervisor selecionado)
  const casasParaFiltro = useMemo(() => {
    if (selectedSupervisor === "all") return casasDisponiveis;
    return casasDisponiveis.filter((casa: any) => 
      casa.supervisor_id === selectedSupervisor || 
      casa.supervisor_esposa_id === selectedSupervisor
    );
  }, [casasDisponiveis, selectedSupervisor]);

  if (loadingCasas || isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (casasDisponiveis.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Nenhuma Casa Refúgio vinculada</p>
          <p className="text-sm">
            Você ainda não tem casas refúgio sob sua responsabilidade
          </p>
        </CardContent>
      </Card>
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

      {/* Filtros */}
      {(supervisoresDisponiveis.length > 1 || casasDisponiveis.length > 1) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {supervisoresDisponiveis.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Supervisor</Label>
                  <Select value={selectedSupervisor} onValueChange={handleSupervisorChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todos os supervisores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os supervisores</SelectItem>
                      {supervisoresDisponiveis.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {casasParaFiltro.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Casa Refúgio</Label>
                  <Select value={selectedCasa} onValueChange={setSelectedCasa}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Todas as casas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as casas</SelectItem>
                      {casasParaFiltro.map((casa: any) => (
                        <SelectItem key={casa.id} value={casa.id}>
                          {casa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats?.totalMembros || 0}</p>
            <p className="text-xs text-muted-foreground">Membros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Home className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats?.totalCasas || 0}</p>
            <p className="text-xs text-muted-foreground">Casas Refúgio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{stats?.totalEncontros || 0}</p>
            <p className="text-xs text-muted-foreground">Encontros/Mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{stats?.novosConvertidos || 0}</p>
            <p className="text-xs text-muted-foreground">Novos/Mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Encontros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats?.totalPessoas || 0}</p>
            <p className="text-xs text-muted-foreground">Pessoas/Mês</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.mediaPorEncontro || 0}</p>
            <p className="text-xs text-muted-foreground">Média/Encontro</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats?.totalKilos || 0} kg</p>
            <p className="text-xs text-muted-foreground">Kilos/Mês</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              R$ {(stats?.totalOfertas || 0).toFixed(0)}
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
