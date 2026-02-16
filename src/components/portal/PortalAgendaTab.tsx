import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeText } from "@/lib/text-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Share2,
  Loader2,
  Users,
  Baby,
  Church,
  Zap,
  User,
  ClipboardList,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  addYears,
  subYears,
  getDay,
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
  genero_alvo: string | null;
  idade_minima: number | null;
  idade_maxima: number | null;
  limite_vagas: number | null;
  tem_custo: boolean | null;
}

type PublicoFiltro = "todos" | "homens" | "mulheres" | "kids" | "cultos" | "jovens" | "impactos" | "adolescentes";
type PeriodoFiltro = "dia" | "semana" | "mes" | "ano";

const publicoOptions: { value: PublicoFiltro; label: string; icon: React.ElementType }[] = [
  { value: "todos", label: "Todos", icon: Users },
  { value: "cultos", label: "Cultos", icon: Church },
  { value: "homens", label: "Homens", icon: User },
  { value: "mulheres", label: "Mulheres", icon: User },
  { value: "kids", label: "Kids", icon: Baby },
  { value: "jovens", label: "Jovens", icon: Zap },
  { value: "adolescentes", label: "Adolescentes", icon: User },
  { value: "impactos", label: "Impactos", icon: Zap },
];

const periodoOptions: { value: PeriodoFiltro; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

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

export const PortalAgendaTab = ({ incluirSomenteConvidados = false }: { incluirSomenteConvidados?: boolean }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [publicoFiltro, setPublicoFiltro] = useState<PublicoFiltro>("todos");
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("semana");
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
    queryKey: ["portal-agenda", incluirSomenteConvidados],
    queryFn: async () => {
      let query = supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("status", "aprovado");
      if (!incluirSomenteConvidados) {
        query = query.neq("genero_alvo", "somente_convidados");
      }
      const { data, error } = await query.order("data_evento");
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Calcular intervalo baseado no período selecionado
  const { start, end } = useMemo(() => {
    switch (periodoFiltro) {
      case "dia":
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case "semana":
        return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
      case "ano":
        return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
      case "mes":
      default:
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, periodoFiltro]);

  // Navegar para anterior/próximo
  const navegarAnterior = () => {
    switch (periodoFiltro) {
      case "dia":
        setCurrentDate(subDays(currentDate, 1));
        break;
      case "semana":
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case "ano":
        setCurrentDate(subYears(currentDate, 1));
        break;
      default:
        setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navegarProximo = () => {
    switch (periodoFiltro) {
      case "dia":
        setCurrentDate(addDays(currentDate, 1));
        break;
      case "semana":
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case "ano":
        setCurrentDate(addYears(currentDate, 1));
        break;
      default:
        setCurrentDate(addMonths(currentDate, 1));
    }
  };

  // Filtrar eventos por público
  const filtrarPorPublico = (evento: Evento): boolean => {
    if (publicoFiltro === "todos") return true;

    const titulo = evento.titulo.toLowerCase();
    const tipo = evento.tipo_evento.toLowerCase();
    const genero = evento.genero_alvo?.toLowerCase() || "";

    switch (publicoFiltro) {
      case "homens":
        return genero === "masculino" || titulo.includes("homens") || titulo.includes("homem");
      case "mulheres":
        return genero === "feminino" || titulo.includes("mulheres") || titulo.includes("mulher");
      case "kids":
        return titulo.includes("kids") || titulo.includes("criança") || 
               (evento.idade_maxima !== null && evento.idade_maxima <= 12);
      case "cultos":
        return tipo === "culto" || tipo === "ceia" || tipo === "batismo";
      case "jovens":
        return titulo.includes("jovem") || titulo.includes("jovens") || titulo.includes("youth") ||
               (evento.idade_minima !== null && evento.idade_minima >= 18 && evento.idade_maxima !== null && evento.idade_maxima <= 35);
      case "adolescentes":
        return titulo.includes("adolescente") || titulo.includes("teens") ||
               (evento.idade_minima !== null && evento.idade_minima >= 12 && evento.idade_maxima !== null && evento.idade_maxima <= 17);
      case "impactos":
        return tipo === "impacto" || tipo === "retiro" || tipo === "conferencia" || 
               titulo.includes("impacto") || titulo.includes("retiro");
      default:
        return true;
    }
  };

  // Gerar eventos para o período selecionado
  const eventosExpandidos = useMemo(() => {
    const days = eachDayOfInterval({ start, end });
    const result: (Evento & { dataCalculada: Date })[] = [];

    eventos.filter(filtrarPorPublico).forEach((evento) => {
      if (evento.recorrente) {
        days.forEach((day) => {
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
            result.push({ ...evento, dataCalculada: day });
          } else if (evento.tipo_recorrencia === "mensal" && evento.dia_semana === diaSemana) {
            if (evento.semana_mes) {
              const primeiroDoMes = startOfMonth(day);
              const primeiroDiaSemanaDoMes = new Date(primeiroDoMes);
              while (getDay(primeiroDiaSemanaDoMes) !== evento.dia_semana) {
                primeiroDiaSemanaDoMes.setDate(primeiroDiaSemanaDoMes.getDate() + 1);
              }
              const semanaDoDia = Math.floor((day.getDate() - primeiroDiaSemanaDoMes.getDate()) / 7) + 1;
              if (semanaDoDia === evento.semana_mes) {
                result.push({ ...evento, dataCalculada: day });
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
            result.push({ ...evento, dataCalculada: day });
          }
        });
      }
    });

    return result.sort((a, b) => a.dataCalculada.getTime() - b.dataCalculada.getTime());
  }, [eventos, start, end, publicoFiltro]);

  // Agrupar eventos por data
  const eventosAgrupados = useMemo(() => {
    const grupos: Record<string, (Evento & { dataCalculada: Date })[]> = {};
    eventosExpandidos.forEach((evento) => {
      const key = format(evento.dataCalculada, "yyyy-MM-dd");
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(evento);
    });

    // Deduplicação por dia
    for (const key of Object.keys(grupos)) {
      let eventosNoDia = grupos[key];

      // Se há Culto de Ceia, remover Culto de Celebração do mesmo dia
      const temCeia = eventosNoDia.some(e => e.tipo_evento === "ceia" || normalizeText(e.titulo).includes("ceia"));
      if (temCeia) {
        eventosNoDia = eventosNoDia.filter(e => {
          if (e.tipo_evento === "culto" && normalizeText(e.titulo).includes("celebracao")) return false;
          return true;
        });
      }

      // Remover duplicatas por título normalizado no mesmo dia
      const vistos = new Set<string>();
      eventosNoDia = eventosNoDia.filter(e => {
        const tituloKey = normalizeText(e.titulo);
        if (vistos.has(tituloKey)) return false;
        vistos.add(tituloKey);
        return true;
      });

      grupos[key] = eventosNoDia;
    }

    return grupos;
  }, [eventosExpandidos]);

  // Formato do título baseado no período
  const getTituloNavegacao = () => {
    switch (periodoFiltro) {
      case "dia":
        return format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
      case "semana":
        return `${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")}`;
      case "ano":
        return format(currentDate, "yyyy");
      default:
        return format(currentDate, "MMMM yyyy", { locale: ptBR });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl">Agenda da Igreja</h2>
        <p className="text-sm text-muted-foreground">
          Veja os eventos e atividades programadas
        </p>
      </div>

      {/* Filtro de Público */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Filtrar por público:</label>
        <div className="flex flex-wrap gap-2">
          {publicoOptions.map((option) => (
            <Button
              key={option.value}
              variant={publicoFiltro === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPublicoFiltro(option.value)}
              className="gap-1"
            >
              <option.icon className="w-4 h-4" />
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">Visualizar por:</label>
        <div className="flex gap-2">
          {periodoOptions.map((option) => (
            <Button
              key={option.value}
              variant={periodoFiltro === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriodoFiltro(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Navegação */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={navegarAnterior}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h3 className="font-heading font-bold text-lg capitalize">
              {getTituloNavegacao()}
            </h3>
            <Button variant="ghost" size="icon" onClick={navegarProximo}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Eventos */}
      {eventosExpandidos.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum evento encontrado para este período
              {publicoFiltro !== "todos" && ` e filtro "${publicoOptions.find(o => o.value === publicoFiltro)?.label}"`}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(eventosAgrupados).map(([dateKey, eventosData]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <Badge
                  variant={isToday(parseISO(dateKey)) ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isToday(parseISO(dateKey)) ? "Hoje" : format(parseISO(dateKey), "EEEE", { locale: ptBR })}
                </Badge>
                <span className="text-sm font-medium text-foreground">
                  {format(parseISO(dateKey), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>

              <div className="space-y-2">
                {eventosData.map((evento, i) => {
                  const precisaInscricao = evento.limite_vagas || evento.tem_custo;
                  
                  return (
                    <Card key={`${evento.id}-${i}`} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
                            style={{ backgroundColor: evento.cor || "#dc2626" }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-foreground">{evento.titulo}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                                  </Badge>
                                  {precisaInscricao && (
                                    <Badge variant="secondary" className="text-xs">
                                      Inscrição
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {precisaInscricao && !evento.recorrente && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => navigate(`/inscricao/${evento.id}`)}
                                    className="gap-1"
                                  >
                                    <ClipboardList className="w-4 h-4" />
                                    <span className="hidden sm:inline">Inscrever</span>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
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
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
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
                            {evento.descricao && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {evento.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

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
