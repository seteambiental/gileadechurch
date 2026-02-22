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

const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCasaRefugio, setSelectedCasaRefugio] = useState<string>("");
  const [selectedMinistry, setSelectedMinistry] = useState<string>("");
  const [selectedTipoCulto, setSelectedTipoCulto] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const currentYear = getYear(currentMonth);

  // Gerar dias do calendário (incluindo dias do mês anterior/posterior para preencher a grade)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

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

  // Buscar escalas do mês (para ver vagas ocupadas — max 2 CRs por culto)
  const { data: escalasDoMes = [], isLoading: loadingEscalas } = useQuery({
    queryKey: ["escalas-cr-mes", format(currentMonth, "yyyy-MM"), selectedMinistry],
    queryFn: async () => {
      const start = format(monthStart, "yyyy-MM-dd");
      const end = format(monthEnd, "yyyy-MM-dd");
      const query = supabase
        .from("escalas_servico")
        .select("id, ministry_id, data_culto, tipo_culto, tipo_escala, status, casa_refugio_id, membros:escala_servico_membros(id)")
        .eq("tipo_escala", "casa_refugio")
        .in("status", ["pendente", "aprovado"])
        .gte("data_culto", start)
        .lte("data_culto", end);
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

  // Dados do calendário: mapear cada dia do mês com informações de culto
  const calendarData = useMemo(() => {
    if (!selectedMinistry || !selectedCasaRefugio) return new Map();
    
    const today = startOfDay(new Date());
    const dataMap = new Map<string, {
      isCulto: boolean;
      tipoCulto: string;
      crsCount: number;
      membrosCount: number;
      alreadyCandidated: boolean;
      isPast: boolean;
    }>();

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    for (const day of days) {
      const dayOfWeek = getDay(day);
      const dateStr = format(day, "yyyy-MM-dd");
      const isPast = isBefore(day, addDays(today, 1));

      // Verificar se é dia de culto
      let isCulto = false;
      let tipoCulto = "";

      if (dayOfWeek === 0) {
        // Domingo: celebração ou ceia (1º domingo)
        if (day.getDate() <= 7) {
          tipoCulto = "ceia";
        } else {
          tipoCulto = "celebracao";
        }
        isCulto = true;
      } else if (dayOfWeek === 3) {
        // Quarta: quarta com propósito
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
        });
      }
    }

    return dataMap;
  }, [selectedMinistry, selectedCasaRefugio, monthStart, monthEnd, escalasDoMes]);

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
              
              {/* Navegação do mês */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold capitalize text-sm">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  <span>Disponível</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  <span>CRs já escaladas</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <span>Sem culto</span>
                </div>
              </div>

              {/* Grid do calendário */}
              <div className="border rounded-lg overflow-hidden">
                {/* Cabeçalho dias da semana */}
                <div className="grid grid-cols-7 bg-muted/50">
                  {DIAS_SEMANA_ABREV.map((dia) => (
                    <div key={dia} className="text-center text-xs font-medium py-2 text-muted-foreground">
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Dias */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, idx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const data = calendarData.get(dateStr);

                    if (!isCurrentMonth) {
                      return (
                        <div key={idx} className="aspect-square border-t border-r last:border-r-0 bg-muted/20" />
                      );
                    }

                    if (!data?.isCulto) {
                      return (
                        <div key={idx} className="aspect-square border-t border-r last:border-r-0 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground/40">{day.getDate()}</span>
                        </div>
                      );
                    }

                    // Dia de culto
                    const hasCrs = data.crsCount > 0;
                    const isFull = data.crsCount >= 2;
                    const isDisabled = data.isPast || isFull || data.alreadyCandidated;
                    const tipoCultoLabel = data.tipoCulto === "ceia" ? "Ceia" : data.tipoCulto === "celebracao" ? "Culto" : "QcP";

                    return (
                      <button
                        key={idx}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && handleCalendarDayClick(dateStr, data.tipoCulto)}
                        className={`aspect-square border-t border-r last:border-r-0 flex flex-col items-center justify-center gap-0.5 transition-colors relative
                          ${hasCrs 
                            ? "bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-950/60" 
                            : "bg-green-100 dark:bg-green-950/40 hover:bg-green-200 dark:hover:bg-green-950/60"
                          }
                          ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                          ${data.alreadyCandidated ? "ring-2 ring-inset ring-blue-400" : ""}
                        `}
                        title={
                          data.alreadyCandidated
                            ? "Sua CR já se candidatou"
                            : isFull
                            ? "2/2 CRs preenchidas"
                            : data.isPast
                            ? "Data passada"
                            : `${data.crsCount}/2 CRs - Clique para candidatar`
                        }
                      >
                        <span className={`text-sm font-bold ${hasCrs ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                          {day.getDate()}
                        </span>
                        <span className={`text-[9px] leading-none font-medium ${hasCrs ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {tipoCultoLabel}
                        </span>
                        {hasCrs && (
                          <span className="text-[8px] leading-none text-red-500 dark:text-red-400 font-semibold">
                            {data.membrosCount > 0 ? `${data.membrosCount}p` : `${data.crsCount}CR`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
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
