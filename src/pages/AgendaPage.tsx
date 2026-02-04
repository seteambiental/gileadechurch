import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  Link,
  Users,
} from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { useToast } from "@/hooks/use-toast";
import { EventoFormDialog } from "@/components/agenda/EventoFormDialog";
import { InscricoesEventoDialog } from "@/components/agenda/InscricoesEventoDialog";
import { InscricoesDashboard } from "@/components/agenda/InscricoesDashboard";
import { CompartilharInscricaoDialog } from "@/components/agenda/CompartilharInscricaoDialog";
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
  limite_vagas: number | null;
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
  const [mostrarInativos, setMostrarInativos] = useState(true);
  const [inscricoesEvento, setInscricoesEvento] = useState<{ id: string; titulo: string; local?: string | null; data_evento?: string; limite_vagas?: number | null } | null>(null);
  const [compartilharEvento, setCompartilharEvento] = useState<{ 
    id: string; 
    titulo: string; 
    data_evento: string;
    hora_inicio?: string | null;
    local?: string | null;
    flyer_url?: string | null;
    cor?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["agenda-igreja", { mostrarInativos }],
    queryFn: async () => {
      let query = supabase
        .from("agenda_igreja")
        .select("*")
        .order("data_evento");

      if (!mostrarInativos) {
        query = query.eq("ativo", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Gerar TODOS os eventos para o calendário
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
                      style={{
                        backgroundColor: evento.cor || "#dc2626",
                        opacity: evento.ativo ? 1 : 0.45,
                      }}
                      title={evento.ativo ? evento.titulo : `${evento.titulo} (inativo)`}
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
        {/* Dashboard de Inscrições */}
        <InscricoesDashboard />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="font-heading font-bold">Calendário</h3>
            <div className="flex items-center gap-2">
              <Switch
                checked={mostrarInativos}
                onCheckedChange={setMostrarInativos}
                aria-label="Mostrar eventos inativos"
              />
              <span className="text-sm text-muted-foreground">Mostrar inativos</span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              setEditingEvento(null);
              setShowEventoForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {renderCalendar()}

        {/* Detalhes do dia selecionado */}
        {selectedDate && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3">
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h4>
              {eventosSelecionados.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum evento neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {eventosSelecionados.map((evento, i) => (
                    <div
                      key={`${evento.id}-${i}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      style={{ opacity: evento.ativo ? 1 : 0.6 }}
                      onClick={() => {
                        setEditingEvento(evento);
                        setShowEventoForm(true);
                      }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: evento.cor || "#dc2626" }} />
                      <div className="flex-1">
                        <p className="font-medium">
                          {evento.titulo}
                          {!evento.ativo && (
                            <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                          {evento.hora_inicio && ` • ${evento.hora_inicio.substring(0, 5)}`}
                          {evento.local && ` • ${evento.local}`}
                        </p>
                      </div>
                      {!evento.recorrente && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompartilharEvento({
                                id: evento.id,
                                titulo: evento.titulo,
                                data_evento: evento.data_evento,
                                hora_inicio: evento.hora_inicio,
                                local: evento.local,
                                flyer_url: evento.flyer_url,
                                cor: evento.cor,
                              });
                            }}
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInscricoesEvento({ 
                                id: evento.id, 
                                titulo: evento.titulo,
                                local: evento.local,
                                data_evento: evento.data_evento,
                                limite_vagas: evento.limite_vagas
                              });
                            }}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <EventoFormDialog
        open={showEventoForm}
        onOpenChange={setShowEventoForm}
        evento={editingEvento}
        selectedDate={selectedDate}
      />

      {inscricoesEvento && (
        <InscricoesEventoDialog
          open={!!inscricoesEvento}
          onOpenChange={(open) => !open && setInscricoesEvento(null)}
          eventoId={inscricoesEvento.id}
          eventoTitulo={inscricoesEvento.titulo}
          eventoLocal={inscricoesEvento.local}
          eventoData={inscricoesEvento.data_evento}
          limiteVagas={inscricoesEvento.limite_vagas}
        />
      )}

      {compartilharEvento && (
        <CompartilharInscricaoDialog
          open={!!compartilharEvento}
          onOpenChange={(open) => !open && setCompartilharEvento(null)}
          evento={compartilharEvento}
        />
      )}
    </div>
  );
};

export default AgendaPage;
