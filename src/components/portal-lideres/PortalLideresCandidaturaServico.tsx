import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  DoorOpen,
  Car,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Home,
  Users,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  startOfDay,
  addDays,
  getYear,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

const RECEPCAO_ID = "499560e6-c0ff-471b-9068-df04ec2d8235";
const ESTACIONAMENTO_ID = "25c5c6c9-20c6-4f67-a324-a3abe275f904";

const TIPOS_CULTO = [
  { value: "celebracao", label: "Celebração (Domingo)", day: 0 },
  { value: "ceia", label: "Ceia (Domingo)", day: 0 },
  { value: "quarta", label: "Quarta com Propósito", day: 3 },
];

const DIAS_SEMANA_ABREV = ["D", "S", "T", "Q", "Q", "S", "S"];

const MIN_PESSOAS: Record<string, number> = {
  [RECEPCAO_ID]: 4,
  [ESTACIONAMENTO_ID]: 4,
};

interface PortalLideresCandidaturaServicoProps {
  memberId: string;
  memberCasasRefugio: { id: string; name: string; isLider: boolean }[];
}

export const PortalLideresCandidaturaServico = ({
  memberId,
  memberCasasRefugio,
}: PortalLideresCandidaturaServicoProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [selectedCasaRefugio, setSelectedCasaRefugio] = useState<string>("");
  const [selectedMinistry, setSelectedMinistry] = useState<string>("");
  const [selectedTipoCulto, setSelectedTipoCulto] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 3 meses a exibir
  const displayMonths = useMemo(() => {
    return [currentMonth, addMonths(currentMonth, 1), addMonths(currentMonth, 2)];
  }, [currentMonth]);

  const currentYear = getYear(currentMonth);

  // Buscar candidaturas existentes da CR neste ano (para regra de max 2/ano)
  const { data: candidaturasCrAno = [], isLoading: loadingCrAno } = useQuery({
    queryKey: ["candidaturas-cr-ano", selectedCasaRefugio, currentYear],
    queryFn: async () => {
      if (!selectedCasaRefugio) return [];
      const { data, error } = await supabase
        .from("escalas_servico")
        .select("id, ministry_id, data_culto, tipo_culto, status, casa_refugio_id")
        .eq("casa_refugio_id", selectedCasaRefugio)
        .eq("tipo_escala", "casa_refugio")
        .in("status", ["pendente", "aprovado"])
        .gte("data_culto", `${currentYear}-01-01`)
        .lte("data_culto", `${currentYear}-12-31`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCasaRefugio,
  });

  // Buscar escalas dos 3 meses exibidos (para ver vagas ocupadas — max 2 CRs por culto)
  const rangeStart = format(startOfMonth(displayMonths[0]), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(displayMonths[2]), "yyyy-MM-dd");

  const { data: escalasDoMes = [], isLoading: loadingEscalas } = useQuery({
    queryKey: ["escalas-cr-mes", rangeStart, rangeEnd, selectedMinistry],
    queryFn: async () => {
      const query = supabase
        .from("escalas_servico")
        .select("id, ministry_id, data_culto, tipo_culto, tipo_escala, status, casa_refugio_id, membros:escala_servico_membros(id)")
        .eq("tipo_escala", "casa_refugio")
        .in("status", ["pendente", "aprovado"])
        .gte("data_culto", rangeStart)
        .lte("data_culto", rangeEnd);
      if (selectedMinistry) {
        query.eq("ministry_id", selectedMinistry);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedMinistry,
  });

  // Contar serviços da CR no ano (agrupando domingo+quarta como 1 serviço)
  const servicosCrNoAno = useMemo(() => {
    if (!selectedCasaRefugio || !selectedMinistry) return 0;
    return candidaturasCrAno.filter(
      (c) => c.ministry_id === selectedMinistry
    ).length;
  }, [candidaturasCrAno, selectedCasaRefugio, selectedMinistry]);

  const atingiuLimiteAnual = servicosCrNoAno >= 2;

  // Dados do calendário por mês
  const buildCalendarDataForMonth = (month: Date) => {
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const today = startOfDay(new Date());
    const minPessoas = MIN_PESSOAS[selectedMinistry] || 4;
    const dataMap = new Map<string, {
      isCulto: boolean;
      tipoCulto: string;
      crsCount: number;
      membrosCount: number;
      alreadyCandidated: boolean;
      isPast: boolean;
      hasMinPessoas: boolean;
    }>();

    const days = eachDayOfInterval({ start: mStart, end: mEnd });

    for (const day of days) {
      const dayOfWeek = getDay(day);
      const dateStr = format(day, "yyyy-MM-dd");
      const isPast = isBefore(day, addDays(today, 1));

      let isCulto = false;
      let tipoCulto = "";

      if (dayOfWeek === 0) {
        tipoCulto = day.getDate() <= 7 ? "ceia" : "celebracao";
        isCulto = true;
      } else if (dayOfWeek === 3) {
        tipoCulto = "quarta";
        isCulto = true;
      }

      if (isCulto) {
        const crsNessaData = escalasDoMes.filter(
          (e) => e.data_culto === dateStr && e.tipo_culto === tipoCulto
        );
        const crsCount = crsNessaData.length;
        const membrosCount = crsNessaData.reduce(
          (sum, e) => sum + ((e as any).membros?.length || 0), 0
        );
        const alreadyCandidated = crsNessaData.some(
          (e) => e.casa_refugio_id === selectedCasaRefugio
        );

        dataMap.set(dateStr, {
          isCulto: true,
          tipoCulto,
          crsCount,
          membrosCount,
          alreadyCandidated,
          isPast,
          hasMinPessoas: membrosCount >= minPessoas,
        });
      }
    }

    return dataMap;
  };

  // Submit candidatura
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCasaRefugio || !selectedMinistry || !selectedTipoCulto || !selectedDate) {
        throw new Error("Preencha todos os campos");
      }

      const { error } = await supabase.from("escalas_servico").insert({
        ministry_id: selectedMinistry,
        data_culto: selectedDate,
        tipo_culto: selectedTipoCulto,
        tipo_escala: "casa_refugio",
        casa_refugio_id: selectedCasaRefugio,
        member_id: memberId,
        status: "pendente",
      });
      if (error) throw error;

      // Se for Recepção e domingo, criar automaticamente candidatura para quarta
      if (selectedMinistry === RECEPCAO_ID && (selectedTipoCulto === "celebracao" || selectedTipoCulto === "ceia")) {
        const domingoDate = parseLocalDate(selectedDate);
        const quartaDate = addDays(domingoDate, 3);
        const quartaStr = format(quartaDate, "yyyy-MM-dd");

        const { error: quartaError } = await supabase.from("escalas_servico").insert({
          ministry_id: RECEPCAO_ID,
          data_culto: quartaStr,
          tipo_culto: "quarta",
          tipo_escala: "casa_refugio",
          casa_refugio_id: selectedCasaRefugio,
          member_id: memberId,
          status: "pendente",
          observacoes: "Gerado automaticamente a partir da candidatura de domingo",
        });
        if (quartaError) {
          console.error("Erro ao criar escala de quarta:", quartaError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidaturas-cr-ano"] });
      queryClient.invalidateQueries({ queryKey: ["escalas-cr-mes"] });
      toast({
        title: "Candidatura enviada!",
        description:
          selectedMinistry === RECEPCAO_ID
            ? "Sua CR foi candidatada para o domingo e a quarta-feira seguinte."
            : "Sua CR foi candidatada para o serviço.",
      });
      setSelectedDate("");
      setSelectedTipoCulto("");
      setShowConfirmDialog(false);
    },
    onError: () => {
      toast({
        title: "Erro ao enviar candidatura",
        description: "Tente novamente.",
        variant: "destructive",
      });
      setShowConfirmDialog(false);
    },
  });

  const handleCalendarDayClick = (dateStr: string, tipoCulto: string) => {
    setSelectedDate(dateStr);
    setSelectedTipoCulto(tipoCulto);
    setShowConfirmDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pendente</Badge>;
      case "aprovado":
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isLoading = loadingCrAno || loadingEscalas;
  const selectedMinistryName = selectedMinistry === RECEPCAO_ID ? "Recepção" : "Estacionamento";
  const selectedCrName = memberCasasRefugio.find((c) => c.id === selectedCasaRefugio)?.name || "";
  const selectedDateFormatted = selectedDate
    ? format(parseLocalDate(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : "";

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
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <Home className="w-6 h-6 text-secondary" />
          Candidatura da Casa Refúgio
        </h2>
        <p className="text-sm text-muted-foreground">
          Candidate sua Casa Refúgio para servir nos cultos. Máximo de 2 serviços por ano e 2 CRs por culto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inscrever Casa Refúgio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Casa Refúgio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Casa Refúgio</label>
            <Select
              value={selectedCasaRefugio}
              onValueChange={(v) => {
                setSelectedCasaRefugio(v);
                setSelectedMinistry("");
                setSelectedTipoCulto("");
                setSelectedDate("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione sua Casa Refúgio" />
              </SelectTrigger>
              <SelectContent>
                {memberCasasRefugio.map((cr) => (
                  <SelectItem key={cr.id} value={cr.id}>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      {cr.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ministério */}
          {selectedCasaRefugio && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Local de Serviço</label>
              <Select
                value={selectedMinistry}
                onValueChange={(v) => {
                  setSelectedMinistry(v);
                  setSelectedTipoCulto("");
                  setSelectedDate("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local de serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RECEPCAO_ID}>
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-4 h-4" />
                      Recepção
                    </div>
                  </SelectItem>
                  <SelectItem value={ESTACIONAMENTO_ID}>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Estacionamento
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Info: limite anual */}
          {selectedMinistry && (
            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-sm">
              <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p>
                <strong>CR {selectedCrName}</strong> já serviu{" "}
                <strong>{servicosCrNoAno}</strong> de 2 vezes em {currentYear} para{" "}
                <strong>{selectedMinistryName}</strong>.
                {selectedMinistry === RECEPCAO_ID && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    Ao candidatar no domingo, a quarta-feira seguinte será incluída automaticamente.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Alerta limite atingido */}
          {selectedMinistry && atingiuLimiteAnual && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800">
                Sua Casa Refúgio já atingiu o limite de 2 serviços no ano para{" "}
                <strong>{selectedMinistryName}</strong>.
              </p>
            </div>
          )}

          {/* Calendário mensal */}
          {selectedMinistry && !atingiuLimiteAnual && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Selecione a data no calendário</label>
              
              {/* Navegação */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 3))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-xs text-muted-foreground">
                  {format(displayMonths[0], "MMM", { locale: ptBR })} – {format(displayMonths[2], "MMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 3))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                  <span>Disponível</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                  <span>CRs escaladas</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  <span>Mín. não atingido</span>
                </div>
              </div>

              {/* 3 mini calendários */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {displayMonths.map((month) => {
                  const mStart = startOfMonth(month);
                  const mEnd = endOfMonth(month);
                  const calStart = startOfWeek(mStart, { weekStartsOn: 0 });
                  const calEnd = endOfWeek(mEnd, { weekStartsOn: 0 });
                  const days = eachDayOfInterval({ start: calStart, end: calEnd });
                  const calData = buildCalendarDataForMonth(month);

                  return (
                    <div key={format(month, "yyyy-MM")} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 text-center py-1">
                        <span className="text-xs font-semibold capitalize">
                          {format(month, "MMMM", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 bg-muted/30">
                        {DIAS_SEMANA_ABREV.map((dia, i) => (
                          <div key={i} className="text-center text-[9px] font-medium py-0.5 text-muted-foreground">
                            {dia}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {days.map((day, idx) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const isCurrentMonth = day.getMonth() === month.getMonth();
                          const data = calData.get(dateStr);

                          if (!isCurrentMonth) {
                            return <div key={idx} className="h-8 border-t border-r bg-muted/10" />;
                          }

                          if (!data?.isCulto) {
                            return (
                              <div key={idx} className="h-8 border-t border-r flex items-center justify-center">
                                <span className="text-[10px] text-muted-foreground/30">{day.getDate()}</span>
                              </div>
                            );
                          }

                          const hasCrs = data.crsCount > 0;
                          const isFull = data.crsCount >= 2;
                          const needsMore = hasCrs && !data.hasMinPessoas;
                          const isDisabled = data.isPast || (isFull && data.hasMinPessoas) || data.alreadyCandidated;

                          return (
                            <button
                              key={idx}
                              disabled={isDisabled}
                              onClick={() => !isDisabled && handleCalendarDayClick(dateStr, data.tipoCulto)}
                              className={`h-8 border-t border-r flex flex-col items-center justify-center transition-colors
                                ${hasCrs
                                  ? needsMore
                                    ? "bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200"
                                    : "bg-red-100 dark:bg-red-950/40 hover:bg-red-200"
                                  : "bg-green-100 dark:bg-green-950/40 hover:bg-green-200"
                                }
                                ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                                ${data.alreadyCandidated ? "ring-1 ring-inset ring-blue-400" : ""}
                              `}
                              title={
                                data.alreadyCandidated
                                  ? "Sua CR já se candidatou"
                                  : isFull && data.hasMinPessoas
                                  ? "Lotado"
                                  : needsMore
                                  ? `${data.membrosCount}/${MIN_PESSOAS[selectedMinistry] || 4} pessoas`
                                  : data.isPast
                                  ? "Data passada"
                                  : "Clique para candidatar"
                              }
                            >
                              <span className={`text-[10px] font-bold leading-none ${
                                hasCrs
                                  ? needsMore ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"
                                  : "text-green-700 dark:text-green-400"
                              }`}>
                                {day.getDate()}
                              </span>
                              {hasCrs && (
                                <span className="text-[7px] leading-none font-semibold text-red-500 dark:text-red-400">
                                  {data.membrosCount}p
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-muted-foreground">
                Mínimo por culto: <strong>Recepção {MIN_PESSOAS[RECEPCAO_ID]}p</strong> · <strong>Estacionamento {MIN_PESSOAS[ESTACIONAMENTO_ID]}p</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de candidaturas da CR */}
      <div>
        <h3 className="font-semibold mb-3">Candidaturas da Casa Refúgio em {currentYear}</h3>
        {candidaturasCrAno.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma candidatura registrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {candidaturasCrAno.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.ministry_id === RECEPCAO_ID ? (
                          <Badge variant="secondary" className="gap-1"><DoorOpen className="w-3 h-3" />Recepção</Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1"><Car className="w-3 h-3" />Estacionamento</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {TIPOS_CULTO.find((t) => t.value === c.tipo_culto)?.label || c.tipo_culto}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium capitalize">
                        {format(parseLocalDate(c.data_culto), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmação */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar candidatura da CR?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está candidatando a <strong>CR {selectedCrName}</strong> para servir no{" "}
              <strong>{selectedMinistryName}</strong> no culto de{" "}
              <strong>{TIPOS_CULTO.find((t) => t.value === selectedTipoCulto)?.label}</strong> em{" "}
              <strong className="capitalize">{selectedDateFormatted}</strong>.
              {selectedMinistry === RECEPCAO_ID && (
                <>
                  <br /><br />
                  A quarta-feira seguinte será incluída automaticamente na Recepção.
                  <br />
                  <strong>Todos os membros</strong> da CR serão escalados na Recepção.
                </>
              )}
              {selectedMinistry === ESTACIONAMENTO_ID && (
                <>
                  <br /><br />
                  Apenas os <strong>membros masculinos</strong> da CR serão escalados no Estacionamento.
                </>
              )}
              <br /><br />
              A candidatura será analisada pelo líder do ministério.
              Limite: 2 serviços por ano para cada ministério.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitMutation.mutate()}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
