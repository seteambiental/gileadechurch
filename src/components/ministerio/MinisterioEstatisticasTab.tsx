import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Users, TrendingUp, Award, BarChart3 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface MinisterioEstatisticasTabProps {
  ministryId: string;
}

interface Integrante {
  id: string;
  member: {
    id: string;
    full_name: string;
  };
  funcao: {
    id: string;
    nome: string;
  };
}

interface EscalaMembro {
  id: string;
  integrante_id: string;
  escala: {
    id: string;
    data_culto: string;
    tipo_culto: string;
  };
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(346, 77%, 49%)",
  "hsl(200, 70%, 50%)",
  "hsl(150, 60%, 45%)",
];

const PERIODOS = [
  { value: "1", label: "Último mês" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Último ano" },
];

export const MinisterioEstatisticasTab = ({ ministryId }: MinisterioEstatisticasTabProps) => {
  const [periodo, setPeriodo] = useState("3");

  const dataInicio = useMemo(() => {
    return format(startOfMonth(subMonths(new Date(), parseInt(periodo))), "yyyy-MM-dd");
  }, [periodo]);

  const dataFim = useMemo(() => {
    return format(endOfMonth(new Date()), "yyyy-MM-dd");
  }, []);

  // Fetch integrantes do ministério
  const { data: integrantes = [] } = useQuery({
    queryKey: ["ministerio-integrantes", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_integrantes")
        .select(`
          id,
          member:members(id, full_name),
          funcao:ministerio_funcoes(id, nome)
        `)
        .eq("ministry_id", ministryId)
        .eq("ativo", true);
      if (error) throw error;
      return data as unknown as Integrante[];
    },
  });

  // Fetch todas as participações no período
  const { data: participacoes = [], isLoading } = useQuery({
    queryKey: ["ministerio-participacoes", ministryId, dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_escala_membros")
        .select(`
          id,
          integrante_id,
          escala:ministerio_escalas(id, data_culto, tipo_culto, ministry_id)
        `)
        .gte("escala.data_culto", dataInicio)
        .lte("escala.data_culto", dataFim);
      if (error) throw error;
      
      // Filter by ministry_id (since we can't filter nested)
      return (data as unknown as EscalaMembro[]).filter(
        (p) => p.escala && (p.escala as any).ministry_id === ministryId
      );
    },
  });

  // Fetch total de escalas no período
  const { data: totalEscalas = 0 } = useQuery({
    queryKey: ["ministerio-total-escalas", ministryId, dataInicio, dataFim],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ministerio_escalas")
        .select("id", { count: "exact", head: true })
        .eq("ministry_id", ministryId)
        .gte("data_culto", dataInicio)
        .lte("data_culto", dataFim);
      if (error) throw error;
      return count || 0;
    },
  });

  // Calcular estatísticas por membro
  const estatisticasPorMembro = useMemo(() => {
    const stats: Record<string, { nome: string; funcao: string; participacoes: number }> = {};
    
    integrantes.forEach((int) => {
      stats[int.id] = {
        nome: int.member?.full_name || "Desconhecido",
        funcao: int.funcao?.nome || "",
        participacoes: 0,
      };
    });

    participacoes.forEach((p) => {
      if (stats[p.integrante_id]) {
        stats[p.integrante_id].participacoes++;
      }
    });

    return Object.entries(stats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.participacoes - a.participacoes);
  }, [integrantes, participacoes]);

  // Dados para o gráfico de barras
  const chartData = useMemo(() => {
    return estatisticasPorMembro.slice(0, 10).map((m) => ({
      nome: m.nome.split(" ")[0], // Primeiro nome apenas
      participacoes: m.participacoes,
    }));
  }, [estatisticasPorMembro]);

  // Dados para gráfico de pizza por função
  const pieData = useMemo(() => {
    const byFuncao: Record<string, number> = {};
    
    participacoes.forEach((p) => {
      const integrante = integrantes.find((i) => i.id === p.integrante_id);
      const funcao = integrante?.funcao?.nome || "Outros";
      byFuncao[funcao] = (byFuncao[funcao] || 0) + 1;
    });

    return Object.entries(byFuncao).map(([name, value]) => ({ name, value }));
  }, [participacoes, integrantes]);

  // Dados para gráfico de pizza por tipo de culto
  const cultoPieData = useMemo(() => {
    const byCulto: Record<string, number> = {};
    
    participacoes.forEach((p) => {
      const tipo = p.escala?.tipo_culto || "outros";
      const label = tipo === "domingo" ? "Domingo" : 
                    tipo === "quarta" ? "Quarta" : 
                    tipo === "sabado" ? "Sábado" : "Especial";
      byCulto[label] = (byCulto[label] || 0) + 1;
    });

    return Object.entries(byCulto).map(([name, value]) => ({ name, value }));
  }, [participacoes]);

  // Top 3 participantes
  const top3 = estatisticasPorMembro.slice(0, 3);

  // Média de participações
  const mediaParticipacoes = useMemo(() => {
    if (integrantes.length === 0) return 0;
    const total = estatisticasPorMembro.reduce((sum, m) => sum + m.participacoes, 0);
    return (total / integrantes.length).toFixed(1);
  }, [estatisticasPorMembro, integrantes]);

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Carregando estatísticas...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex justify-end">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEscalas}</p>
                <p className="text-xs text-muted-foreground">Escalas no período</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Users className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{integrantes.length}</p>
                <p className="text-xs text-muted-foreground">Integrantes ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <TrendingUp className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{participacoes.length}</p>
                <p className="text-xs text-muted-foreground">Total participações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-4/10">
                <BarChart3 className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mediaParticipacoes}</p>
                <p className="text-xs text-muted-foreground">Média por pessoa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 participantes */}
      {top3.length > 0 && (
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Mais Participações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {top3.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? "bg-yellow-500/10 border border-yellow-500/30" :
                    index === 1 ? "bg-slate-300/10 border border-slate-300/30" :
                    "bg-amber-700/10 border border-amber-700/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? "bg-yellow-500 text-yellow-950" :
                    index === 1 ? "bg-slate-300 text-slate-800" :
                    "bg-amber-700 text-amber-100"
                  }`}>
                    {index + 1}º
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.nome}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{member.funcao}</Badge>
                      <span className="text-xs text-muted-foreground">{member.participacoes}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de barras - Participações por membro */}
        {chartData.length > 0 && (
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Participações por Membro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="nome" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="participacoes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de pizza - Por função */}
        {pieData.length > 0 && (
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição por Função</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabela completa de participações */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhamento por Integrante</CardTitle>
        </CardHeader>
        <CardContent>
          {estatisticasPorMembro.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma participação no período</p>
          ) : (
            <div className="space-y-2">
              {estatisticasPorMembro.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{member.nome}</span>
                    <Badge variant="outline" className="text-xs">{member.funcao}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{member.participacoes}</span>
                    <span className="text-xs text-muted-foreground">participações</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
