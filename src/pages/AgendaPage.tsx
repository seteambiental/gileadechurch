import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Church,
  Image,
  Download,
} from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { useToast } from "@/hooks/use-toast";
import { EventoFormDialog } from "@/components/agenda/EventoFormDialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek, isToday, isSameMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  data_fim: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  tipo_evento: string;
  genero_alvo: string;
  cor: string | null;
  recorrente: boolean;
  tipo_recorrencia: string | null;
  dia_semana: number | null;
  semana_mes: number | null;
  flyer_url: string | null;
  observacoes: string | null;
  ativo: boolean;
}

const tipoEventoLabels: Record<string, string> = {
  culto: "Culto",
  ceia: "Santa Ceia",
  batismo: "Batismo",
  impacto: "Impacto",
  retiro: "Retiro",
  conferencia: "Conferência",
  casa_refugio: "Casa Refúgio",
  evento: "Evento",
};

const AgendaPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const bypass = isAuthBypassed();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [activeTab, setActiveTab] = useState("calendario");

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["agenda-igreja"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .order("data_evento");
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Gerar eventos recorrentes para o mês atual
  const getEventosDoMes = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    const eventosExpandidos: (Evento & { dataCalculada: Date })[] = [];

    eventos.forEach(evento => {
      if (evento.recorrente) {
        days.forEach(day => {
          const diaSemana = getDay(day);
          
          if (evento.tipo_recorrencia === "semanal" && evento.dia_semana === diaSemana) {
            // Para ceia, verificar se é a semana correta do mês
            if (evento.semana_mes) {
              const primeiroDoMes = startOfMonth(day);
              const primeiroDiaSemanaDoMes = new Date(primeiroDoMes);
              while (getDay(primeiroDiaSemanaDoMes) !== evento.dia_semana) {
                primeiroDiaSemanaDoMes.setDate(primeiroDiaSemanaDoMes.getDate() + 1);
              }
              const semanaDoDia = Math.floor((day.getDate() - primeiroDiaSemanaDoMes.getDate()) / 7) + 1;
              if (semanaDoDia !== evento.semana_mes) return;
            }
            
            eventosExpandidos.push({ ...evento, dataCalculada: day });
          } else if (evento.tipo_recorrencia === "mensal" && evento.dia_semana === diaSemana) {
            // Verificar semana do mês
            if (evento.semana_mes) {
              const primeiroDoMes = startOfMonth(day);
              const primeiroDiaSemanaDoMes = new Date(primeiroDoMes);
              while (getDay(primeiroDiaSemanaDoMes) !== evento.dia_semana) {
                primeiroDiaSemanaDoMes.setDate(primeiroDiaSemanaDoMes.getDate() + 1);
              }
              const semanaDoDia = Math.floor((day.getDate() - primeiroDiaSemanaDoMes.getDate()) / 7) + 1;
              if (semanaDoDia === evento.semana_mes) {
                eventosExpandidos.push({ ...evento, dataCalculada: day });
              }
            }
          }
        });
      } else {
        // Evento único ou multi-dias
        const dataInicio = parseISO(evento.data_evento);
        const dataFim = evento.data_fim ? parseISO(evento.data_fim) : dataInicio;
        
        // Verificar cada dia do mês se está dentro do intervalo do evento
        days.forEach(day => {
          if (isWithinInterval(day, { start: dataInicio, end: dataFim }) || isSameDay(day, dataInicio) || isSameDay(day, dataFim)) {
            eventosExpandidos.push({ ...evento, dataCalculada: day });
          }
        });
      }
    });

    return eventosExpandidos;
  };

  const eventosDoMes = getEventosDoMes();

  const getEventosDodia = (date: Date) => {
    return eventosDoMes.filter(e => isSameDay(e.dataCalculada, date));
  };

  const renderCalendar = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header do Calendário */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-heading font-bold text-lg capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do Mês */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const eventosHoje = getEventosDodia(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`
                  min-h-[80px] p-1 border-b border-r border-border cursor-pointer transition-colors
                  ${!isCurrentMonth ? "bg-muted/30" : "hover:bg-muted/50"}
                  ${isSelected ? "bg-primary/10 ring-1 ring-primary" : ""}
                  ${isToday(day) ? "bg-primary/5" : ""}
                `}
              >
                <div className={`
                  text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday(day) ? "bg-primary text-primary-foreground" : ""}
                  ${!isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"}
                `}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {eventosHoje.slice(0, 2).map((evento, i) => (
                    <div
                      key={`${evento.id}-${i}`}
                      className="text-[10px] px-1 py-0.5 rounded truncate text-white"
                      style={{ backgroundColor: evento.cor || "#dc2626" }}
                    >
                      {evento.titulo}
                    </div>
                  ))}
                  {eventosHoje.length > 2 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{eventosHoje.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const eventosSelecionados = selectedDate ? getEventosDodia(selectedDate) : [];

  // Eventos únicos (não recorrentes) para a aba de eventos
  const eventosUnicos = eventos.filter(e => !e.recorrente);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">Agenda da Igreja</h1>
              <p className="text-xs text-muted-foreground">Programação e Eventos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="calendario" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="eventos" className="flex items-center gap-2">
              <PartyPopper className="w-4 h-4" />
              Eventos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Calendário */}
              <div className="lg:col-span-2">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  renderCalendar()
                )}
              </div>

              {/* Painel lateral - Eventos do dia */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold">
                    {selectedDate 
                      ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                      : "Selecione um dia"
                    }
                  </h3>
                  <Button size="sm" variant="secondary" onClick={() => {
                    setEditingEvento(null);
                    setShowEventoForm(true);
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Evento
                  </Button>
                </div>

                {selectedDate && eventosSelecionados.length === 0 && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum evento neste dia</p>
                    </CardContent>
                  </Card>
                )}

                {eventosSelecionados.map((evento, i) => (
                  <Card 
                    key={`${evento.id}-${i}`} 
                    className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setEditingEvento(evento);
                      setShowEventoForm(true);
                    }}
                  >
                    <div className="h-1" style={{ backgroundColor: evento.cor || "#dc2626" }} />
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{evento.titulo}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                          </span>
                        </div>
                        {evento.flyer_url && (
                          <Image className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      {(evento.hora_inicio || evento.local) && (
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {evento.hora_inicio && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {evento.hora_inicio.substring(0, 5)}
                              {evento.hora_fim && ` - ${evento.hora_fim.substring(0, 5)}`}
                            </span>
                          )}
                          {evento.local && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {evento.local}
                            </span>
                          )}
                        </div>
                      )}

                      {evento.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{evento.descricao}</p>
                      )}

                      {evento.observacoes && (
                        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          {evento.observacoes}
                        </div>
                      )}

                      {evento.recorrente && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Church className="w-3 h-3" />
                          <span>Programação fixa</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="eventos" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold">Eventos Especiais</h3>
              <Button variant="secondary" onClick={() => {
                setEditingEvento(null);
                setShowEventoForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>
            </div>

            {eventosUnicos.length === 0 ? (
              <Card className="bg-muted/30">
                <CardContent className="pt-6 text-center text-muted-foreground py-12">
                  <PartyPopper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhum evento especial cadastrado</p>
                  <p className="text-sm">Crie eventos como retiros, conferências, batismos especiais</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventosUnicos.map(evento => (
                  <Card 
                    key={evento.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {evento.flyer_url ? (
                      <div 
                        className="h-40 bg-muted cursor-pointer"
                        onClick={() => {
                          setEditingEvento(evento);
                          setShowEventoForm(true);
                        }}
                      >
                        <img src={evento.flyer_url} alt={evento.titulo} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div 
                        className="h-2 cursor-pointer" 
                        style={{ backgroundColor: evento.cor || "#dc2626" }}
                        onClick={() => {
                          setEditingEvento(evento);
                          setShowEventoForm(true);
                        }}
                      />
                    )}
                    <CardContent className="pt-4 space-y-2">
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingEvento(evento);
                          setShowEventoForm(true);
                        }}
                      >
                        <h4 className="font-semibold">{evento.titulo}</h4>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(parseISO(evento.data_evento), "dd/MM/yyyy")}
                          </span>
                          {evento.hora_inicio && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {evento.hora_inicio.substring(0, 5)}
                            </span>
                          )}
                        </div>
                        {evento.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{evento.descricao}</p>
                        )}
                      </div>
                      
                      {evento.flyer_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = evento.flyer_url!;
                            link.download = `flyer-${evento.titulo.replace(/\s+/g, '-').toLowerCase()}.png`;
                            link.target = '_blank';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Flyer
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <EventoFormDialog
        open={showEventoForm}
        onOpenChange={setShowEventoForm}
        evento={editingEvento}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default AgendaPage;
