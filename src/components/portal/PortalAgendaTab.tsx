import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Share2,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameMonth,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CompartilharInscricaoDialog } from "@/components/agenda/CompartilharInscricaoDialog";

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
  cor: string | null;
  recorrente: boolean;
  tipo_recorrencia: string | null;
  dia_semana: number | null;
  semana_mes: number | null;
  flyer_url: string | null;
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

export const PortalAgendaTab = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [compartilharEvento, setCompartilharEvento] = useState<{
    id: string;
    titulo: string;
    data_evento: string;
    hora_inicio?: string | null;
    local?: string | null;
    flyer_url?: string | null;
    cor?: string | null;
  } | null>(null);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["portal-agenda"],
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

    eventos.forEach((evento) => {
      if (evento.recorrente) {
        days.forEach((day) => {
          const diaSemana = getDay(day);

          if (
            evento.tipo_recorrencia === "semanal" &&
            evento.dia_semana === diaSemana
          ) {
            if (evento.semana_mes) {
              const primeiroDoMes = startOfMonth(day);
              const primeiroDiaSemanaDoMes = new Date(primeiroDoMes);
              while (getDay(primeiroDiaSemanaDoMes) !== evento.dia_semana) {
                primeiroDiaSemanaDoMes.setDate(
                  primeiroDiaSemanaDoMes.getDate() + 1
                );
              }
              const semanaDoDia =
                Math.floor(
                  (day.getDate() - primeiroDiaSemanaDoMes.getDate()) / 7
                ) + 1;
              if (semanaDoDia !== evento.semana_mes) return;
            }

            eventosExpandidos.push({ ...evento, dataCalculada: day });
          } else if (
            evento.tipo_recorrencia === "mensal" &&
            evento.dia_semana === diaSemana
          ) {
            if (evento.semana_mes) {
              const primeiroDoMes = startOfMonth(day);
              const primeiroDiaSemanaDoMes = new Date(primeiroDoMes);
              while (getDay(primeiroDiaSemanaDoMes) !== evento.dia_semana) {
                primeiroDiaSemanaDoMes.setDate(
                  primeiroDiaSemanaDoMes.getDate() + 1
                );
              }
              const semanaDoDia =
                Math.floor(
                  (day.getDate() - primeiroDiaSemanaDoMes.getDate()) / 7
                ) + 1;
              if (semanaDoDia === evento.semana_mes) {
                eventosExpandidos.push({ ...evento, dataCalculada: day });
              }
            }
          }
        });
      } else {
        const dataInicio = parseISO(evento.data_evento);
        const dataFim = evento.data_fim ? parseISO(evento.data_fim) : dataInicio;

        days.forEach((day) => {
          if (
            isWithinInterval(day, { start: dataInicio, end: dataFim }) ||
            isSameDay(day, dataInicio) ||
            isSameDay(day, dataFim)
          ) {
            eventosExpandidos.push({ ...evento, dataCalculada: day });
          }
        });
      }
    });

    return eventosExpandidos;
  };

  const eventosDoMes = getEventosDoMes();

  const getEventosDoDia = (date: Date) => {
    return eventosDoMes.filter((e) => isSameDay(e.dataCalculada, date));
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-heading font-bold text-lg capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dias do Mês */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const eventosHoje = getEventosDoDia(day);
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
                <div
                  className={`
                  text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday(day) ? "bg-primary text-primary-foreground" : ""}
                  ${!isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"}
                `}
                >
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

  const eventosSelecionados = selectedDate ? getEventosDoDia(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl">Agenda da Igreja</h2>
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
              <p className="text-muted-foreground text-sm">
                Nenhum evento neste dia.
              </p>
            ) : (
              <div className="space-y-3">
                {eventosSelecionados.map((evento, i) => (
                  <div
                    key={`${evento.id}-${i}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: evento.cor || "#dc2626" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{evento.titulo}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        <span>
                          {tipoEventoLabels[evento.tipo_evento] ||
                            evento.tipo_evento}
                        </span>
                        {evento.hora_inicio && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {evento.hora_inicio.substring(0, 5)}
                          </span>
                        )}
                        {evento.local && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {evento.local}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() =>
                        setCompartilharEvento({
                          id: evento.id,
                          titulo: evento.titulo,
                          data_evento: format(evento.dataCalculada, "yyyy-MM-dd"),
                          hora_inicio: evento.hora_inicio,
                          local: evento.local,
                          flyer_url: evento.flyer_url,
                          cor: evento.cor,
                        })
                      }
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Próximos Eventos */}
      <div>
        <h3 className="font-semibold mb-3">Próximos Eventos</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {eventos
            .filter((e) => !e.recorrente && new Date(e.data_evento) >= new Date())
            .slice(0, 6)
            .map((evento) => (
              <Card key={evento.id} className="overflow-hidden">
                {evento.flyer_url && (
                  <img
                    src={evento.flyer_url}
                    alt={evento.titulo}
                    className="w-full h-32 object-cover"
                  />
                )}
                <CardContent className="pt-4">
                  <h4 className="font-semibold">{evento.titulo}</h4>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() =>
                      setCompartilharEvento({
                        id: evento.id,
                        titulo: evento.titulo,
                        data_evento: evento.data_evento,
                        hora_inicio: evento.hora_inicio,
                        local: evento.local,
                        flyer_url: evento.flyer_url,
                        cor: evento.cor,
                      })
                    }
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Compartilhar
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {compartilharEvento && (
        <CompartilharInscricaoDialog
          open={!!compartilharEvento}
          onOpenChange={() => setCompartilharEvento(null)}
          evento={compartilharEvento}
        />
      )}
    </div>
  );
};
