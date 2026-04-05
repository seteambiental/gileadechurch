import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, Users, CheckCircle, Clock, Bell, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";

// Unified inscription interface merging both tables
interface UnifiedInscricao {
  id: string;
  evento_id: string;
  forma_pagamento: string | null;
  status_pagamento: string;
  nome: string;
  telefone: string;
  lista_espera: boolean;
  valor_inscricao: number;
  valor_pago: number;
  source: "agenda" | "impacto";
}

interface Evento {
  id: string;
  titulo: string;
  data_evento: string;
  local: string | null;
  necessita_inscricao: boolean;
  limite_vagas: number | null;
  tem_custo: boolean | null;
  valor_custo: number | null;
}

const COLORS: Record<string, string> = {
  pix: "#16a34a",
  cartao_credito: "#2563eb",
  cartao_debito: "#7c3aed",
  dinheiro: "#f59e0b",
  vale: "#06b6d4",
  misto: "#8b5cf6",
  cartao: "#2563eb",
  nao_informado: "#94a3b8",
  pago: "#16a34a",
  pendente: "#eab308",
  parcial: "#f97316",
  confirmado: "#16a34a",
  cancelado: "#dc2626",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
  dinheiro: "Dinheiro",
  vale: "Vale",
  misto: "Misto",
  cartao: "Cartão",
  nao_informado: "Não informado",
};

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  parcial: "Parcial",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const InscricoesDashboard = () => {
  const { toast } = useToast();
  const [selectedEvento, setSelectedEvento] = useState<string>("");
  const [sendingReminders, setSendingReminders] = useState(false);

  // Fetch agenda inscriptions
  const { data: inscricoesAgenda = [], isLoading: loadingAgenda } = useQuery({
    queryKey: ["all-inscricoes-agenda"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("id, evento_id, forma_pagamento, status_pagamento, nome_participante, telefone_contato, lista_espera, valor_inscricao");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch impacto inscriptions (real financial data)
  const { data: inscricoesImpacto = [], isLoading: loadingImpacto } = useQuery({
    queryKey: ["all-inscricoes-impacto"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select("id, evento_id, forma_pagamento, status_pagamento, nome, telefone, valor_inscricao, valor_pago, aprovado");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch impacto events to get titles
  const { data: impactoEventos = [], isLoading: loadingImpactoEventos } = useQuery({
    queryKey: ["impacto-eventos-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, local, limite_vagas, tem_custo, valor_inscricao");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agenda events
  const { data: agendaEventos = [], isLoading: loadingEventos } = useQuery({
    queryKey: ["eventos-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, local, necessita_inscricao, limite_vagas, tem_custo, valor_custo")
        .eq("ativo", true)
        .eq("recorrente", false)
        .eq("necessita_inscricao", true)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Build unified event list (agenda events + impacto events not already in agenda)
  const allEventos = useMemo(() => {
    const eventMap = new Map<string, Evento>();
    agendaEventos.forEach(e => eventMap.set(e.id, e));
    impactoEventos.forEach(ie => {
      if (!eventMap.has(ie.id)) {
        eventMap.set(ie.id, {
          id: ie.id,
          titulo: ie.titulo,
          data_evento: ie.data_inicio,
          local: ie.local,
          necessita_inscricao: true,
          limite_vagas: ie.limite_vagas,
          tem_custo: ie.tem_custo,
          valor_custo: ie.valor_inscricao,
        });
      }
    });
    return Array.from(eventMap.values()).sort((a, b) => 
      a.data_evento.localeCompare(b.data_evento)
    );
  }, [agendaEventos, impactoEventos]);

  // Build unified inscriptions - impacto data takes priority
  const allInscricoes = useMemo(() => {
    const result: UnifiedInscricao[] = [];
    
    // Set of evento_ids that have impacto inscriptions
    const impactoEventoIds = new Set(inscricoesImpacto.map(i => i.evento_id));

    // Add impacto inscriptions (these have real financial data)
    inscricoesImpacto.forEach(i => {
      result.push({
        id: i.id,
        evento_id: i.evento_id,
        forma_pagamento: i.forma_pagamento,
        status_pagamento: i.status_pagamento || "pendente",
        nome: i.nome,
        telefone: i.telefone || "",
        lista_espera: false,
        valor_inscricao: i.valor_inscricao ?? 0,
        valor_pago: i.valor_pago ?? 0,
        source: "impacto",
      });
    });

    // Add agenda inscriptions ONLY for events without impacto data
    inscricoesAgenda.forEach(i => {
      if (!impactoEventoIds.has(i.evento_id)) {
        result.push({
          id: i.id,
          evento_id: i.evento_id,
          forma_pagamento: i.forma_pagamento,
          status_pagamento: i.status_pagamento || "pendente",
          nome: i.nome_participante,
          telefone: i.telefone_contato || "",
          lista_espera: !!i.lista_espera,
          valor_inscricao: i.valor_inscricao ?? 0,
          valor_pago: 0,
          source: "agenda",
        });
      }
    });

    return result;
  }, [inscricoesAgenda, inscricoesImpacto]);

  // Filter by selected event — empty means no data shown
  const inscricoesFiltradas = selectedEvento && selectedEvento !== ""
    ? allInscricoes.filter(i => i.evento_id === selectedEvento)
    : [];

  const inscricoesPendentes = inscricoesFiltradas.filter(
    i => (i.status_pagamento === "pendente") && !i.lista_espera
  );

  const eventoSelecionado = allEventos.find(e => e.id === selectedEvento);

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

  const isLoading = loadingAgenda || loadingImpacto || loadingImpactoEventos || loadingEventos;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats
  const inscricoesAtivas = inscricoesFiltradas.filter(i => !i.lista_espera);
  const totalInscricoes = inscricoesAtivas.length;
  const pagos = inscricoesAtivas.filter(i => i.status_pagamento === "pago" || i.status_pagamento === "confirmado").length;
  const pendentes = inscricoesAtivas.filter(i => i.status_pagamento === "pendente").length;
  const parciais = inscricoesAtivas.filter(i => i.status_pagamento === "parcial").length;
  const listaEspera = inscricoesFiltradas.filter(i => i.lista_espera).length;

  // Financial stats
  const receitaPrevista = inscricoesAtivas.reduce((sum, i) => sum + i.valor_inscricao, 0);
  const receitaRecebida = inscricoesAtivas.reduce((sum, i) => sum + i.valor_pago, 0);
  const receitaPendente = receitaPrevista - receitaRecebida;

  // Inscriptions by event (only when no specific event selected)
  const inscricoesPorEvento = !selectedEvento ? allEventos.map(evento => {
    const count = allInscricoes.filter(i => i.evento_id === evento.id && !i.lista_espera).length;
    return {
      name: evento.titulo.length > 20 ? evento.titulo.substring(0, 20) + "..." : evento.titulo,
      inscricoes: count,
    };
  }).filter(e => e.inscricoes > 0).sort((a, b) => b.inscricoes - a.inscricoes).slice(0, 10) : [];

  // Payment methods - show monetary values
  const formasPagamentoData = inscricoesAtivas.reduce((acc, i) => {
    const key = i.forma_pagamento || "nao_informado";
    if (!acc[key]) acc[key] = { count: 0, valor: 0 };
    acc[key].count += 1;
    acc[key].valor += i.valor_pago > 0 ? i.valor_pago : i.valor_inscricao;
    return acc;
  }, {} as Record<string, { count: number; valor: number }>);

  const formasPagamento = Object.entries(formasPagamentoData).map(([name, data]) => ({
    name: PAYMENT_LABELS[name] || name,
    value: data.valor,
    count: data.count,
    color: COLORS[name] || "#888",
  }));

  // Payment status
  const statusData = inscricoesAtivas.reduce((acc, i) => {
    const key = i.status_pagamento || "pendente";
    if (!acc[key]) acc[key] = { count: 0, valor: 0 };
    acc[key].count += 1;
    acc[key].valor += key === "pago" || key === "confirmado" ? i.valor_pago : i.valor_inscricao;
    return acc;
  }, {} as Record<string, { count: number; valor: number }>);

  const statusPagamento = Object.entries(statusData).map(([name, data]) => ({
    name: STATUS_LABELS[name] || name,
    value: data.count,
    valor: data.valor,
    color: COLORS[name] || "#888",
  }));

  const isUpcomingEvent = eventoSelecionado
    ? differenceInDays(parseLocalDate(eventoSelecionado.data_evento), new Date()) >= 0
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
                  {allEventos.map(evento => (
                    <SelectItem key={evento.id} value={evento.id}>
                      {evento.titulo} - {format(parseLocalDate(evento.data_evento), "dd/MM/yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedEvento !== "todos" && isUpcomingEvent && inscricoesPendentes.length > 0 && (
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
            )}
          </div>
          
          {selectedEvento !== "todos" && eventoSelecionado && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold">{eventoSelecionado.titulo}</h3>
              <p className="text-sm text-muted-foreground">
                {format(parseLocalDate(eventoSelecionado.data_evento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {eventoSelecionado.local && ` • ${eventoSelecionado.local}`}
                {eventoSelecionado.limite_vagas && ` • ${totalInscricoes}/${eventoSelecionado.limite_vagas} vagas`}
                {eventoSelecionado.tem_custo && eventoSelecionado.valor_custo && ` • ${formatCurrency(eventoSelecionado.valor_custo)}`}
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
                <p className="text-2xl font-bold text-green-600">{pagos}</p>
                <p className="text-sm text-muted-foreground">Pagos</p>
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
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{parciais + listaEspera}</p>
                <p className="text-sm text-muted-foreground">
                  {parciais > 0 ? `${parciais} parcial` : ""}{parciais > 0 && listaEspera > 0 ? " / " : ""}{listaEspera > 0 ? `${listaEspera} espera` : "Parcial/Espera"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(receitaPrevista)}</p>
                <p className="text-sm text-muted-foreground">Receita Prevista</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(receitaRecebida)}</p>
                <p className="text-sm text-muted-foreground">Receita Recebida</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(receitaPendente)}</p>
                <p className="text-sm text-muted-foreground">A Receber</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {eventoSelecionado?.limite_vagas && (
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Vagas Ocupadas</span>
                    <span className="text-lg font-bold">
                      {totalInscricoes}/{eventoSelecionado.limite_vagas}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Taxa de Pagamento</span>
                  <span className="text-lg font-bold text-green-600">
                    {totalInscricoes > 0 ? Math.round((pagos / totalInscricoes) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Receita Prevista</span>
                  <span className="text-lg font-bold">{formatCurrency(receitaPrevista)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Receita Recebida</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(receitaRecebida)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">A Receber</span>
                  <span className="text-lg font-bold text-yellow-600">{formatCurrency(receitaPendente)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm">Pagos / Pendentes / Parcial</span>
                  <span className="text-lg font-bold">
                    <span className="text-green-600">{pagos}</span>
                    {" / "}
                    <span className="text-yellow-600">{pendentes}</span>
                    {" / "}
                    <span className="text-orange-600">{parciais}</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods and Status */}
        <div className="grid grid-rows-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Formas de Pagamento (Valor)</CardTitle>
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
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                    <Tooltip formatter={(value: number, name: string, props: any) => {
                      const item = statusPagamento.find(s => s.name === name);
                      return [`${value} inscrições (${formatCurrency(item?.valor || 0)})`, name];
                    }} />
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