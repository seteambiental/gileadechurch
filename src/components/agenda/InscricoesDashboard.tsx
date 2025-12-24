import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Loader2, Users, CreditCard, CheckCircle, Clock } from "lucide-react";

interface Inscricao {
  id: string;
  evento_id: string;
  forma_pagamento: string;
  status_pagamento: string;
}

interface Evento {
  id: string;
  titulo: string;
}

const COLORS = {
  pix: "#16a34a",
  cartao_credito: "#2563eb",
  cartao_debito: "#7c3aed",
  pendente: "#eab308",
  confirmado: "#16a34a",
  cancelado: "#dc2626",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

export const InscricoesDashboard = () => {
  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["all-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("id, evento_id, forma_pagamento, status_pagamento");
      if (error) throw error;
      return data as Inscricao[];
    },
  });

  const { data: eventos = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["eventos-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo")
        .eq("ativo", true)
        .eq("recorrente", false);
      if (error) throw error;
      return data as Evento[];
    },
  });

  if (loadingInscricoes || loadingEventos) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats
  const totalInscricoes = inscricoes.length;
  const confirmadas = inscricoes.filter(i => i.status_pagamento === "confirmado").length;
  const pendentes = inscricoes.filter(i => i.status_pagamento === "pendente").length;

  // Inscriptions by event
  const inscricoesPorEvento = eventos.map(evento => {
    const count = inscricoes.filter(i => i.evento_id === evento.id).length;
    return {
      name: evento.titulo.length > 20 ? evento.titulo.substring(0, 20) + "..." : evento.titulo,
      inscricoes: count,
    };
  }).filter(e => e.inscricoes > 0).sort((a, b) => b.inscricoes - a.inscricoes).slice(0, 10);

  // Payment methods
  const formasPagamento = Object.entries(
    inscricoes.reduce((acc, i) => {
      acc[i.forma_pagamento] = (acc[i.forma_pagamento] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: PAYMENT_LABELS[name] || name,
    value,
    color: COLORS[name as keyof typeof COLORS] || "#888",
  }));

  // Payment status
  const statusPagamento = Object.entries(
    inscricoes.reduce((acc, i) => {
      acc[i.status_pagamento] = (acc[i.status_pagamento] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name,
    value,
    color: COLORS[name as keyof typeof COLORS] || "#888",
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInscricoes}</p>
                <p className="text-sm text-muted-foreground">Total de Inscrições</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{confirmadas}</p>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {totalInscricoes > 0 ? Math.round((confirmadas / totalInscricoes) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Confirmação</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inscriptions by Event */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscrições por Evento</CardTitle>
          </CardHeader>
          <CardContent>
            {inscricoesPorEvento.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhuma inscrição ainda</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inscricoesPorEvento} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="inscricoes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods and Status */}
        <div className="grid grid-rows-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {formasPagamento.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={formasPagamento}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {formasPagamento.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="middle" 
                      align="right" 
                      layout="vertical"
                      iconSize={10}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {statusPagamento.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Sem dados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={statusPagamento}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPagamento.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend 
                      verticalAlign="middle" 
                      align="right" 
                      layout="vertical"
                      iconSize={10}
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
