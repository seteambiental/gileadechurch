 import { useState, useMemo } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
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
 
 interface Evento {
   id: string;
   titulo: string;
   descricao: string | null;
   data_evento: string;
   hora_inicio: string | null;
   hora_fim: string | null;
   tipo_evento: string;
   cor: string | null;
   recorrente: boolean;
   dia_semana: number | null;
   semana_mes: number | null;
   tipo_recorrencia: string | null;
   ativo: boolean;
 }
 
 interface AgendaCalendarProps {
   eventos: Evento[];
   onEventoClick: (evento: Evento) => void;
   onNovoEvento: () => void;
   isLoading?: boolean;
 }
 
 type ViewType = "dia" | "semana" | "mes" | "ano";
 
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
 
 const diasSemanaAbrev = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
 const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
 
 export const AgendaCalendar = ({ eventos, onEventoClick, onNovoEvento, isLoading }: AgendaCalendarProps) => {
   const [currentDate, setCurrentDate] = useState(new Date());
   const [view, setView] = useState<ViewType>("mes");
 
   // Gera eventos recorrentes para um intervalo de datas
   const getEventosParaData = (date: Date) => {
     const diaSemana = getDay(date);
     const dateStr = format(date, "yyyy-MM-dd");
     const semanaDoMes = getWeekOfMonth(date, { weekStartsOn: 0 });
 
     return eventos.filter((evento) => {
       if (evento.recorrente) {
         // Verifica se o dia da semana coincide
         if (evento.dia_semana !== diaSemana) return false;
         
         // Se for evento mensal (tem semana_mes definido), verifica se é a semana correta
         if (evento.semana_mes !== null && evento.semana_mes !== undefined) {
           return evento.semana_mes === semanaDoMes;
         }
         
         // Evento semanal - aparece toda semana naquele dia
         return true;
       } else {
         return evento.data_evento === dateStr;
       }
     });
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
     
     return (
       <Card>
         <CardContent className="p-4">
           <div className="text-center mb-4">
             <h3 className="text-2xl font-bold text-primary">{format(currentDate, "d")}</h3>
             <p className="text-muted-foreground">{format(currentDate, "EEEE", { locale: ptBR })}</p>
           </div>
           
           {eventosHoje.length === 0 ? (
             <p className="text-center text-muted-foreground py-8">Nenhum evento neste dia</p>
           ) : (
             <div className="space-y-2">
               {eventosHoje.map((evento) => (
                 <div
                   key={evento.id}
                   className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                   style={{ borderLeft: `4px solid ${evento.cor || "hsl(var(--primary))"}` }}
                   onClick={() => onEventoClick(evento)}
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
       <div className="grid grid-cols-7 gap-2">
         {days.map((day) => {
           const eventosDay = getEventosParaData(day);
           const isCurrentDay = isToday(day);
 
           return (
             <Card key={day.toISOString()} className={`min-h-[140px] ${isCurrentDay ? "ring-2 ring-primary" : ""}`}>
               <CardContent className="p-2">
                 <div className={`text-center mb-2 pb-2 border-b ${isCurrentDay ? "text-primary font-bold" : ""}`}>
                   <p className="text-xs text-muted-foreground">{diasSemanaAbrev[getDay(day)]}</p>
                   <p className={`text-lg ${isCurrentDay ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
                     {format(day, "d")}
                   </p>
                 </div>
                 
                 <div className="space-y-1 max-h-[100px] overflow-y-auto">
                   {eventosDay.slice(0, 3).map((evento) => (
                     <div
                       key={evento.id}
                       className="text-xs p-1.5 rounded cursor-pointer hover:opacity-80 truncate"
                       style={{ 
                         backgroundColor: evento.cor ? `${evento.cor}20` : "hsl(var(--primary) / 0.1)",
                         borderLeft: `3px solid ${evento.cor || "hsl(var(--primary))"}`,
                       }}
                       onClick={() => onEventoClick(evento)}
                     >
                       <span className="font-medium">{evento.hora_inicio?.substring(0, 5)}</span> {evento.titulo}
                     </div>
                   ))}
                   {eventosDay.length > 3 && (
                     <p className="text-xs text-muted-foreground text-center">+{eventosDay.length - 3} mais</p>
                   )}
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
 
             return (
               <div
                 key={day.toISOString()}
                 className={`min-h-[80px] p-1 rounded-lg border ${
                   isCurrentDay ? "ring-2 ring-primary bg-primary/5" : ""
                 } ${!isCurrentMonth ? "opacity-40 bg-muted/30" : "bg-card"}`}
               >
                 <p className={`text-xs text-center mb-1 ${isCurrentDay ? "font-bold text-primary" : ""}`}>
                   {format(day, "d")}
                 </p>
                 <div className="space-y-0.5">
                   {eventosDay.slice(0, 2).map((evento) => (
                     <div
                       key={evento.id}
                       className="text-[10px] px-1 py-0.5 rounded cursor-pointer hover:opacity-80 truncate"
                       style={{ 
                         backgroundColor: evento.cor || "hsl(var(--primary))",
                         color: "white",
                       }}
                       onClick={() => onEventoClick(evento)}
                     >
                       {evento.titulo}
                     </div>
                   ))}
                   {eventosDay.length > 2 && (
                     <p className="text-[10px] text-muted-foreground text-center">+{eventosDay.length - 2}</p>
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
     <div className="space-y-4">
       {/* Header com navegação e filtros */}
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div className="flex items-center gap-2">
           <Button variant="outline" size="icon" onClick={navigatePrev}>
             <ChevronLeft className="w-4 h-4" />
           </Button>
           <Button variant="outline" size="icon" onClick={navigateNext}>
             <ChevronRight className="w-4 h-4" />
           </Button>
           <Button variant="ghost" size="sm" onClick={goToToday}>
             Hoje
           </Button>
           <h3 className="font-semibold text-lg capitalize ml-2">{getDateRangeLabel()}</h3>
         </div>
         
         <div className="flex items-center gap-2">
           <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
             <TabsList>
               <TabsTrigger value="dia">Dia</TabsTrigger>
               <TabsTrigger value="semana">Semana</TabsTrigger>
               <TabsTrigger value="mes">Mês</TabsTrigger>
               <TabsTrigger value="ano">Ano</TabsTrigger>
             </TabsList>
           </Tabs>
           
           <Button variant="secondary" onClick={onNovoEvento}>
             <Plus className="w-4 h-4 mr-2" />
             Novo
           </Button>
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