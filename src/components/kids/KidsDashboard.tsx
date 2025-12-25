import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth, eachWeekOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
} from "recharts";
import { Users, TrendingUp, UserCheck, CalendarCheck } from "lucide-react";

interface TurmaConfig {
  id: string;
  turma: string;
  nome_exibicao: string;
  cor_hex: string;
  idade_minima: number;
  idade_maxima: number;
}

interface Crianca {
  id: string;
  nome: string;
  idade: number;
  genero: string | null;
  whatsapp: string | null;
  foto: string | null;
  tipo: "membro" | "novo_convertido";
}

interface KidsDashboardProps {
  turmasConfig: TurmaConfig[];
  criancasPorTurma: Record<string, Crianca[]>;
}

export const KidsDashboard = ({ turmasConfig, criancasPorTurma }: KidsDashboardProps) => {
  // Buscar presenças do último mês
  const { data: presencas } = useQuery({
    queryKey: ["kids-presencas-dashboard"],
    queryFn: async () => {
      const inicio = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      const fim = format(endOfMonth(new Date()), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("kids_presencas")
        .select("*")
        .gte("data_culto", inicio)
        .lte("data_culto", fim);
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar líderes
  const { data: lideres } = useQuery({
    queryKey: ["kids-lideres-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kids_lideres")
        .select("turma")
        .eq("ativo", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Dados para gráfico de pizza por turma
  const dadosPizza = useMemo(() => {
    return turmasConfig.map((turma) => ({
      name: turma.nome_exibicao,
      value: criancasPorTurma[turma.turma]?.length || 0,
      cor: turma.cor_hex,
    }));
  }, [turmasConfig, criancasPorTurma]);

  // Dados para gráfico de barras por gênero
  const dadosGenero = useMemo(() => {
    return turmasConfig.map((turma) => {
      const criancas = criancasPorTurma[turma.turma] || [];
      return {
        turma: turma.nome_exibicao,
        meninos: criancas.filter((c) => c.genero === "masculino").length,
        meninas: criancas.filter((c) => c.genero === "feminino").length,
        cor: turma.cor_hex,
      };
    });
  }, [turmasConfig, criancasPorTurma]);

  // Dados de presença por semana
  const dadosPresenca = useMemo(() => {
    if (!presencas) return [];
    
    const porData: Record<string, { presentes: number; total: number }> = {};
    
    presencas.forEach((p) => {
      if (!porData[p.data_culto]) {
        porData[p.data_culto] = { presentes: 0, total: 0 };
      }
      porData[p.data_culto].total++;
      if (p.presente) porData[p.data_culto].presentes++;
    });

    return Object.entries(porData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([data, valores]) => ({
        data: format(parseISO(data), "dd/MM"),
        presentes: valores.presentes,
        total: valores.total,
        percentual: valores.total > 0 
          ? Math.round((valores.presentes / valores.total) * 100) 
          : 0,
      }));
  }, [presencas]);

  // Totais
  const totalCriancas = Object.values(criancasPorTurma).reduce(
    (acc, arr) => acc + arr.length, 0
  );
  
  const totalLideres = lideres?.length || 0;

  const mediaPresenca = useMemo(() => {
    if (!dadosPresenca.length) return 0;
    const soma = dadosPresenca.reduce((acc, d) => acc + d.percentual, 0);
    return Math.round(soma / dadosPresenca.length);
  }, [dadosPresenca]);

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCriancas}</p>
                <p className="text-xs text-muted-foreground">Crianças</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLideres}</p>
                <p className="text-xs text-muted-foreground">Líderes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <CalendarCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mediaPresenca}%</p>
                <p className="text-xs text-muted-foreground">Média Presença</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{turmasConfig.length}</p>
                <p className="text-xs text-muted-foreground">Turmas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição por turma */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosPizza}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {dadosPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gênero por turma */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gênero por Turma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGenero}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="turma" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="meninos" name="Meninos" fill="#3b82f6" />
                  <Bar dataKey="meninas" name="Meninas" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Frequência */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Frequência nos Últimos Cultos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosPresenca}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis unit="%" />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, "Presença"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentual" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo das turmas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo das Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {turmasConfig.map((turma) => {
              const criancas = criancasPorTurma[turma.turma] || [];
              const lideresT = lideres?.filter((l) => l.turma === turma.turma).length || 0;
              
              return (
                <div 
                  key={turma.turma}
                  className="p-4 rounded-lg border"
                  style={{ borderColor: turma.cor_hex }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: turma.cor_hex }} 
                    />
                    <span className="font-semibold">{turma.nome_exibicao}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crianças:</span>
                      <span className="font-medium">{criancas.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Líderes:</span>
                      <span className="font-medium">{lideresT}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Faixa:</span>
                      <span className="font-medium">{turma.idade_minima}-{turma.idade_maxima} anos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
