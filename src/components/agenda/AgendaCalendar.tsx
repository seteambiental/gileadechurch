 import { useState, useMemo } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { normalizeText } from "@/lib/text-utils";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isToday,
  getDay,
  getWeekOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFeriadoParaData } from "@/lib/feriados";
 
interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  data_fim: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  tipo_evento: string;
  cor: string | null;
  recorrente: boolean;
  dia_semana: number | null;
  dias_semana: number[] | null;
  semana_mes: number | null;
  tipo_recorrencia: string | null;
  ativo: boolean;
}
 
interface AgendaCalendarProps {
  eventos: Evento[];
  onEventoClick?: (evento: Evento) => void;
  onNovoCompromisso?: () => void;
  isLoading?: boolean;
  defaultView?: ViewType;
}
 
 type ViewType = "dia" | "semana" | "mes" | "ano";
 
  const tipoEventoLabels: Record<string, string> = {
    culto: "Culto",
    ceia: "Culto de Ceia",
    batismo: "Batismo",
    impacto: "Impacto",
    retiro: "Retiro",
    conferencia: "Conferência",
    casa_refugio: "Casa Refúgio",
    gileade_fest: "Gileade Fest",
    retiro_kids: "Retiro Kids",
    evento: "Evento",
    conexao_lider: "Conexão Líder",
    quarta_proposito: "Quarta com Propósito",
    quarta_proposito_prestacao: "Quarta com Propósito - Prestação de Contas",
    cursos: "Cursos",
    aulas: "Aulas",
    apresentacao_criancas: "Apresentação de Crianças",
    outros: "Outros",
  };
 
 const diasSemanaAbrev = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
 const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
 
 export const AgendaCalendar = ({ eventos, onEventoClick, onNovoCompromisso, isLoading, defaultView }: AgendaCalendarProps) => {
   const [currentDate, setCurrentDate] = useState(new Date());
   const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
   const [view, setView] = useState<ViewType>(defaultView || (isMobile ? "semana" : "mes"));
 
   // Gera eventos recorrentes para um intervalo de datas
    const getEventosParaData = (date: Date) => {
      const diaSemana = getDay(date);
      const dateStr = format(date, "yyyy-MM-dd");
      const semanaDoMes = getWeekOfMonth(date, { weekStartsOn: 0 });

    const eventosFiltrados = eventos.filter((evento) => {
        if (evento.recorrente) {
          if (evento.dia_semana !== diaSemana) return false;
          // Verificar se a data está dentro do intervalo de início/fim da recorrência
          if (evento.data_evento && dateStr < evento.data_evento) return false;
          if (evento.data_fim && dateStr > evento.data_fim) return false;
          if (evento.semana_mes !== null && evento.semana_mes !== undefined && evento.semana_mes > 0) {
            return evento.semana_mes === semanaDoMes;
          }
          return true;
        } else {
          // Para eventos com data_fim, verificar se o dia está no intervalo
          if (evento.data_fim) {
            return dateStr >= evento.data_evento && dateStr <= evento.data_fim;
          }
          return evento.data_evento === dateStr;
        }
      });

      // Se há Culto e Culto de Ceia no mesmo dia, remover o Culto regular
      const temCeia = eventosFiltrados.some(e => e.tipo_evento === "ceia");
      if (temCeia) {
        return eventosFiltrados.filter(e => e.tipo_evento !== "culto");
      }

      // Se há Quarta com Propósito - Prestação de Contas, remover a Quarta com Propósito regular
      const temQuartaPrestacao = eventosFiltrados.some(
        e => e.tipo_evento === "quarta_proposito" || e.tipo_evento === "quarta_proposito_prestacao"
      );
      if (temQuartaPrestacao) {
        return eventosFiltrados.filter(e => {
          // Remove cultos cujo título contenha "propósito" (ex: "Quarta com Propósito", "Culto de Quarta com Propósito")
          if (e.tipo_evento === "culto" && normalizeText(e.titulo).includes("proposito")) return false;
          return true;
        });
      }

      return eventosFiltrados;
    };
 
   const navigatePrev = () => {
     switch (view) {
       case "dia":
         setCurrentDate(subDays(currentDate, 1));
         break;
       case "semana":
         setCurrentDate(subWeeks(currentDate, 1));
         break;
       case "mes":
         setCurrentDate(subMonths(currentDate, 1));
         break;
       case "ano":
         setCurrentDate(subYears(currentDate, 1));
         break;
     }
   };
 
   const navigateNext = () => {
     switch (view) {
       case "dia":
         setCurrentDate(addDays(currentDate, 1));
         break;
       case "semana":
         setCurrentDate(addWeeks(currentDate, 1));
         break;
       case "mes":
         setCurrentDate(addMonths(currentDate, 1));
         break;
       case "ano":
         setCurrentDate(addYears(currentDate, 1));
         break;
     }
   };
 
   const goToToday = () => setCurrentDate(new Date());
 
   const getDateRangeLabel = () => {
     switch (view) {
       case "dia":
         return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
       case "semana": {
         const start = startOfWeek(currentDate, { weekStartsOn: 0 });
         const end = endOfWeek(currentDate, { weekStartsOn: 0 });
         return `${format(start, "d MMM", { locale: ptBR })} - ${format(end, "d MMM yyyy", { locale: ptBR })}`;
       }
       case "mes":
         return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
       case "ano":
         return format(currentDate, "yyyy");
     }
   };
 
   // Renderiza a visualização do dia
    const renderDayView = () => {
      const eventosHoje = getEventosParaData(currentDate);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const feriado = getFeriadoParaData(dateStr);
      
      return (
        <Card>
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold text-primary">{format(currentDate, "d")}</h3>
              <p className="text-muted-foreground">{format(currentDate, "EEEE", { locale: ptBR })}</p>
            </div>

            {feriado && (
              <div
                className="flex items-center gap-3 p-3 rounded-lg mb-2 font-bold"
                style={{ backgroundColor: "#ccff0020", borderLeft: "4px solid #a3e635", color: "#65a30d" }}
              >
                🎉 {feriado.nome}
              </div>
            )}
            
            {eventosHoje.length === 0 && !feriado ? (
              <p className="text-center text-muted-foreground py-8">Nenhum evento neste dia</p>
            ) : (
              <div className="space-y-2">
                {eventosHoje.map((evento) => (
                  <div
                    key={evento.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    style={{ borderLeft: `4px solid ${evento.cor || "hsl(var(--primary))"}` }}
                    onClick={() => onEventoClick?.(evento)}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{evento.hora_inicio?.substring(0, 5) || "—"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{evento.titulo}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    };
 
   // Renderiza a visualização da semana
   const renderWeekView = () => {
     const start = startOfWeek(currentDate, { weekStartsOn: 0 });
     const end = endOfWeek(currentDate, { weekStartsOn: 0 });
     const days = eachDayOfInterval({ start, end });
 
     return (
       <div className="space-y-2">
         {days.map((day) => {
           const eventosDay = getEventosParaData(day);
           const isCurrentDay = isToday(day);
           const dayStr = format(day, "yyyy-MM-dd");
           const feriado = getFeriadoParaData(dayStr);

           return (
             <Card key={day.toISOString()} className={`${isCurrentDay ? "ring-2 ring-primary" : ""}`}>
               <CardContent className="p-3">
                 <div className={`flex items-center gap-3 mb-2 ${isCurrentDay ? "text-primary" : ""}`}>
                   <div className={`text-center min-w-[40px] ${isCurrentDay ? "bg-primary text-primary-foreground rounded-lg py-1" : ""}`}>
                     <p className="text-[10px] uppercase font-medium">{diasSemanaAbrev[getDay(day)]}</p>
                     <p className="text-lg font-bold leading-tight">{format(day, "d")}</p>
                   </div>
                   <div className="flex-1 space-y-1">
                     {feriado && (
                       <div
                         className="text-xs px-2 py-1 rounded font-bold"
                         style={{ backgroundColor: "#a3e635", color: "#1a2e05" }}
                       >
                         🎉 {feriado.nome}
                       </div>
                     )}
                     {eventosDay.length === 0 && !feriado && (
                       <p className="text-xs text-muted-foreground">Sem eventos</p>
                     )}
                     {eventosDay.map((evento) => (
                       <div
                         key={evento.id}
                         className="text-xs px-2 py-1.5 rounded cursor-pointer hover:opacity-80 flex items-center gap-2"
                         style={{ 
                           backgroundColor: evento.cor ? `${evento.cor}15` : "hsl(var(--primary) / 0.08)",
                           borderLeft: `3px solid ${evento.cor || "hsl(var(--primary))"}`,
                         }}
                         onClick={() => onEventoClick?.(evento)}
                       >
                         <span className="font-semibold text-muted-foreground">{evento.hora_inicio?.substring(0, 5) || "—"}</span>
                         <span className="font-medium truncate">{evento.titulo}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               </CardContent>
             </Card>
           );
         })}
       </div>
     );
   };
 
   // Renderiza a visualização do mês
   const renderMonthView = () => {
     const start = startOfMonth(currentDate);
     const end = endOfMonth(currentDate);
     const startWeek = startOfWeek(start, { weekStartsOn: 0 });
     const endWeek = endOfWeek(end, { weekStartsOn: 0 });
     const days = eachDayOfInterval({ start: startWeek, end: endWeek });
 
     return (
       <div>
         <div className="grid grid-cols-7 gap-1 mb-1">
           {diasSemanaAbrev.map((dia) => (
             <div key={dia} className="text-center text-xs font-medium text-muted-foreground py-2">
               {dia}
             </div>
           ))}
         </div>
         <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const eventosDay = getEventosParaData(day);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayStr = format(day, "yyyy-MM-dd");
              const feriado = getFeriadoParaData(dayStr);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-1 rounded-lg border ${
                    isCurrentDay ? "ring-2 ring-primary bg-primary/5" : ""
                  } ${!isCurrentMonth ? "opacity-40 bg-muted/30" : "bg-card"}`}
                >
                  <p className={`text-xs text-center mb-1 ${isCurrentDay ? "font-bold text-primary" : ""}`}>
                    {format(day, "d")}
                  </p>
                  <div className="space-y-0.5">
                    {feriado && (
                      <div
                        className="text-[10px] px-1 py-0.5 rounded truncate font-bold"
                        style={{ backgroundColor: "#a3e635", color: "#1a2e05" }}
                      >
                        🎉 {feriado.nome}
                      </div>
                    )}
                     {eventosDay.slice(0, feriado ? 2 : 3).map((evento) => (
                      <div
                        key={evento.id}
                        className="text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 truncate"
                        style={{ 
                          backgroundColor: evento.cor || "hsl(var(--primary))",
                          color: "white",
                        }}
                        onClick={() => onEventoClick?.(evento)}
                      >
                        {evento.titulo}
                      </div>
                    ))}
                     {eventosDay.length > (feriado ? 2 : 3) && (
                       <p className="text-[10px] text-muted-foreground text-center">+{eventosDay.length - (feriado ? 2 : 3)}</p>
                     )}
                  </div>
                </div>
              );
            })}
         </div>
       </div>
     );
   };
 
   // Renderiza a visualização do ano
   const renderYearView = () => {
     const year = currentDate.getFullYear();
     
     return (
       <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
         {mesesAbrev.map((mes, index) => {
           const monthDate = new Date(year, index, 1);
           const start = startOfMonth(monthDate);
           const end = endOfMonth(monthDate);
           const days = eachDayOfInterval({ start, end });
           
           const eventosNoMes = days.reduce((count, day) => {
             return count + getEventosParaData(day).length;
           }, 0);
 
           const isCurrentMonth = index === new Date().getMonth() && year === new Date().getFullYear();
 
           return (
             <Card
               key={mes}
               className={`cursor-pointer hover:shadow-md transition-shadow ${isCurrentMonth ? "ring-2 ring-primary" : ""}`}
               onClick={() => {
                 setCurrentDate(new Date(year, index, 1));
                 setView("mes");
               }}
             >
               <CardContent className="p-4 text-center">
                 <h4 className={`font-semibold mb-2 ${isCurrentMonth ? "text-primary" : ""}`}>{mes}</h4>
                 <p className="text-2xl font-bold text-muted-foreground">{eventosNoMes}</p>
                 <p className="text-xs text-muted-foreground">eventos</p>
               </CardContent>
             </Card>
           );
         })}
       </div>
     );
   };
 
   if (isLoading) {
     return (
       <div className="flex justify-center py-12">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
       </div>
     );
   }
 
   return (
     <div className="space-y-3 sm:space-y-4">
       {/* Header com navegação e filtros */}
       <div className="flex flex-col gap-3">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-1.5">
             <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrev}>
               <ChevronLeft className="w-4 h-4" />
             </Button>
             <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
               <ChevronRight className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToToday}>
               Hoje
             </Button>
           </div>
           <h3 className="font-semibold text-sm sm:text-lg capitalize">{getDateRangeLabel()}</h3>
         </div>
         
         <div className="flex items-center justify-between gap-2">
           <Tabs value={view} onValueChange={(v) => setView(v as ViewType)} className="flex-1">
             <TabsList className="w-full">
               <TabsTrigger value="dia" className="flex-1 text-xs sm:text-sm">Dia</TabsTrigger>
               <TabsTrigger value="semana" className="flex-1 text-xs sm:text-sm">Semana</TabsTrigger>
               <TabsTrigger value="mes" className="flex-1 text-xs sm:text-sm">Mês</TabsTrigger>
               <TabsTrigger value="ano" className="flex-1 text-xs sm:text-sm">Ano</TabsTrigger>
             </TabsList>
           </Tabs>
           
            {onNovoCompromisso && (
              <Button variant="secondary" size="sm" onClick={onNovoCompromisso}>
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Compromisso</span>
              </Button>
            )}
         </div>
       </div>
 
       {/* Visualização do calendário */}
       {view === "dia" && renderDayView()}
       {view === "semana" && renderWeekView()}
       {view === "mes" && renderMonthView()}
       {view === "ano" && renderYearView()}
     </div>
   );
 };