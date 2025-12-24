import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Users, CreditCard, CheckCircle, Clock, Send, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Inscricao {
  id: string;
  evento_id: string;
  forma_pagamento: string;
  status_pagamento: string;
  nome_participante: string;
  telefone_contato: string;
  lista_espera: boolean;
}

interface Evento {
  id: string;
  titulo: string;
  data_evento: string;
  local: string | null;
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
  const { toast } = useToast();
  const [selectedEvento, setSelectedEvento] = useState<string>("todos");
  const [sendingReminders, setSendingReminders] = useState(false);

  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["all-inscricoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("id, evento_id, forma_pagamento, status_pagamento, nome_participante, telefone_contato, lista_espera");
      if (error) throw error;
      return data as Inscricao[];
    },
  });

  const { data: eventos = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["eventos-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, local")
        .eq("ativo", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Filter inscricoes by selected event
  const inscricoesFiltradas = selectedEvento === "todos" 
    ? inscricoes 
    : inscricoes.filter(i => i.evento_id === selectedEvento);

  // Get pending payments for selected event (for reminder)
  const inscricoesPendentes = inscricoesFiltradas.filter(
    i => i.status_pagamento === "pendente" && !i.lista_espera
  );

  // Find the selected event details
  const eventoSelecionado = eventos.find(e => e.id === selectedEvento);

  const handleEnviarLembretes = async () => {
    if (!eventoSelecionado || inscricoesPendentes.length === 0) return;

    setSendingReminders(true);
    let enviados = 0;
    let erros = 0;

    for (const inscricao of inscricoesPendentes) {
      try {
        await supabase.functions.invoke('enviar-whatsapp', {
          body: {
            action: 'lembrete_pagamento',
            inscricaoId: inscricao.id,
            evento: {
              titulo: eventoSelecionado.titulo,
              data_evento: eventoSelecionado.data_evento,
              local: eventoSelecionado.local,
            },
          },
        });
        enviados++;
      } catch (error) {
        console.error('Erro ao enviar lembrete:', error);
        erros++;
      }
    }

    setSendingReminders(false);
    toast({
      title: "Lembretes enviados!",
      description: `${enviados} lembretes enviados com sucesso.${erros > 0 ? ` ${erros} falhas.` : ''}`,
    });
  };

  if (loadingInscricoes || loadingEventos) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats
  const totalInscricoes = inscricoesFiltradas.filter(i => !i.lista_espera).length;
  const confirmadas = inscricoesFiltradas.filter(i => i.status_pagamento === "confirmado" && !i.lista_espera).length;
  const pendentes = inscricoesFiltradas.filter(i => i.status_pagamento === "pendente" && !i.lista_espera).length;
  const listaEspera = inscricoesFiltradas.filter(i => i.lista_espera).length;

  // Inscriptions by event (only when showing all)
  const inscricoesPorEvento = selectedEvento === "todos" ? eventos.map(evento => {
    const count = inscricoes.filter(i => i.evento_id === evento.id && !i.lista_espera).length;
    return {
      name: evento.titulo.length > 20 ? evento.titulo.substring(0, 20) + "..." : evento.titulo,
      inscricoes: count,
    };
  }).filter(e => e.inscricoes > 0).sort((a, b) => b.inscricoes - a.inscricoes).slice(0, 10) : [];

  // Payment methods
  const formasPagamento = Object.entries(
    inscricoesFiltradas.filter(i => !i.lista_espera).reduce((acc, i) => {
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
    inscricoesFiltradas.filter(i => !i.lista_espera).reduce((acc, i) => {
      acc[i.status_pagamento] = (acc[i.status_pagamento] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name,
    value,
    color: COLORS[name as keyof typeof COLORS] || "#888",
  }));

  // Check if event is upcoming (for reminder button)
  const isUpcomingEvent = eventoSelecionado 
    ? differenceInDays(parseISO(eventoSelecionado.data_evento), new Date()) >= 0
    : false;

  return (
    <div className="space-y-6">
      {/* Filter by Event */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filtrar por Evento</label>
              <Select value={selectedEvento} onValueChange={setSelectedEvento}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os eventos</SelectItem>
                  {eventos.map(evento => (
                    <SelectItem key={evento.id} value={evento.id}>
                      {evento.titulo} - {format(parseISO(evento.data_evento), "dd/MM/yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedEvento !== "todos" && isUpcomingEvent && inscricoesPendentes.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleEnviarLembretes}
                  disabled={sendingReminders}
                >
                  {sendingReminders ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Enviar Lembretes ({inscricoesPendentes.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          
          {selectedEvento !== "todos" && eventoSelecionado && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold">{eventoSelecionado.titulo}</h3>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(eventoSelecionado.data_evento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {eventoSelecionado.local && ` • ${eventoSelecionado.local}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInscricoes}</p>
                <p className="text-sm text-muted-foreground">Inscritos</p>
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
              <div className="p-3 bg-orange-500/10 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{listaEspera}</p>
                <p className="text-sm text-muted-foreground">Lista Espera</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inscriptions by Event - only show when filtering by all */}
        {selectedEvento === "todos" ? (
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Taxa de Confirmação</span>
                  <span className="text-lg font-bold text-green-600">
                    {totalInscricoes > 0 ? Math.round((confirmadas / totalInscricoes) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Pagamentos Pendentes</span>
                  <span className="text-lg font-bold text-yellow-600">{pendentes}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Lista de Espera</span>
                  <span className="text-lg font-bold text-orange-600">{listaEspera}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
