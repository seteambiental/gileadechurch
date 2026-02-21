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
  Send,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
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
  getMonth,
  getYear,
} from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// IDs dos ministérios de Recepção e Estacionamento
const RECEPCAO_ID = "499560e6-c0ff-471b-9068-df04ec2d8235";
const ESTACIONAMENTO_ID = "25c5c6c9-20c6-4f67-a324-a3abe275f904";

const TIPOS_CULTO = [
  { value: "celebracao", label: "Celebração (Domingo)", day: 0 },
  { value: "ceia", label: "Ceia (Domingo)", day: 0 },
  { value: "quarta", label: "Quarta com Propósito", day: 3 },
];

interface PortalCandidaturaServicoTabProps {
  memberId: string;
}

export const PortalCandidaturaServicoTab = ({ memberId }: PortalCandidaturaServicoTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMinistry, setSelectedMinistry] = useState<string>("");
  const [selectedTipoCulto, setSelectedTipoCulto] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Buscar candidaturas existentes do membro (para verificar regra mensal)
  const { data: minhasCandidaturas = [], isLoading: loadingMine } = useQuery({
    queryKey: ["minhas-candidaturas-servico", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalas_servico")
        .select("id, ministry_id, data_culto, tipo_culto, status")
        .eq("member_id", memberId)
        .eq("tipo_escala", "individual")
        .in("status", ["pendente", "aprovado"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });

  // Buscar todas as escalas aprovadas/pendentes do mês selecionado (para verificar vagas)
  const { data: escalasDoMes = [], isLoading: loadingEscalas } = useQuery({
    queryKey: ["escalas-servico-mes", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(monthStart, "yyyy-MM-dd");
      const end = format(monthEnd, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("escalas_servico")
        .select("id, ministry_id, data_culto, tipo_culto, tipo_escala, status")
        .gte("data_culto", start)
        .lte("data_culto", end)
        .eq("tipo_escala", "individual")
        .in("status", ["pendente", "aprovado"]);
      if (error) throw error;
      return data || [];
    },
  });

  // Gerar datas de culto disponíveis no mês
  const availableDates = useMemo(() => {
    if (!selectedMinistry || !selectedTipoCulto) return [];

    const tipoCulto = TIPOS_CULTO.find((t) => t.value === selectedTipoCulto);
    if (!tipoCulto) return [];

    const today = startOfDay(new Date());
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days
      .filter((day) => {
        // Filtrar pelo dia da semana correto
        if (getDay(day) !== tipoCulto.day) return false;
        // Não permitir datas passadas (precisa ser pelo menos amanhã)
        if (isBefore(day, addDays(today, 1))) return false;
        return true;
      })
      .map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        // Verificar se já tem candidatura individual aprovada/pendente nesta data
        const occupied = escalasDoMes.some(
          (e) =>
            e.data_culto === dateStr &&
            e.tipo_culto === selectedTipoCulto &&
            e.ministry_id === selectedMinistry
        );
        return { date: day, dateStr, occupied };
      });
  }, [selectedMinistry, selectedTipoCulto, monthStart, monthEnd, escalasDoMes]);

  // Verificar se o membro já candidatou neste mês para este ministério
  const hasMonthCandidatura = useMemo(() => {
    if (!selectedMinistry) return false;
    const monthNum = getMonth(currentMonth);
    const yearNum = getYear(currentMonth);
    return minhasCandidaturas.some((c) => {
      const cDate = parseLocalDate(c.data_culto);
      return (
        c.ministry_id === selectedMinistry &&
        getMonth(cDate) === monthNum &&
        getYear(cDate) === yearNum
      );
    });
  }, [selectedMinistry, currentMonth, minhasCandidaturas]);

  // Submit candidatura
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMinistry || !selectedTipoCulto || !selectedDate) {
        throw new Error("Preencha todos os campos");
      }

      const { error } = await supabase.from("escalas_servico").insert({
        ministry_id: selectedMinistry,
        data_culto: selectedDate,
        tipo_culto: selectedTipoCulto,
        tipo_escala: "individual",
        member_id: memberId,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-candidaturas-servico"] });
      queryClient.invalidateQueries({ queryKey: ["escalas-servico-mes"] });
      toast({
        title: "Candidatura enviada!",
        description: "Sua candidatura será analisada pelo líder do ministério.",
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

  const isLoading = loadingMine || loadingEscalas;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  const selectedMinistryName = selectedMinistry === RECEPCAO_ID ? "Recepção" : "Estacionamento";
  const selectedDateFormatted = selectedDate
    ? format(parseLocalDate(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl flex items-center gap-2">
          <Send className="w-6 h-6 text-secondary" />
          Quero Servir na Porta / Estacionamento
        </h2>
        <p className="text-sm text-muted-foreground">
          Candidate-se para servir em um culto específico. Limite de 1 candidatura por mês para cada ministério.
        </p>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escolher data para servir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ministério */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Ministério</label>
            <Select value={selectedMinistry} onValueChange={(v) => { setSelectedMinistry(v); setSelectedDate(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ministério" />
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

          {/* Alerta se já tem candidatura no mês */}
          {selectedMinistry && hasMonthCandidatura && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800">
                Você já possui uma candidatura para <strong>{selectedMinistryName}</strong> neste mês.
                Escolha outro mês para se candidatar.
              </p>
            </div>
          )}

          {/* Tipo de Culto */}
          {selectedMinistry && !hasMonthCandidatura && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Culto</label>
              <Select value={selectedTipoCulto} onValueChange={(v) => { setSelectedTipoCulto(v); setSelectedDate(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de culto" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CULTO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Seleção de data */}
          {selectedMinistry && selectedTipoCulto && !hasMonthCandidatura && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <div className="flex items-center gap-2 mb-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-32 text-center capitalize text-sm">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {availableDates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma data disponível neste mês para o tipo de culto selecionado.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableDates.map(({ date, dateStr, occupied }) => (
                    <Button
                      key={dateStr}
                      variant={selectedDate === dateStr ? "default" : "outline"}
                      className={`justify-start h-auto py-3 ${occupied ? "opacity-50" : ""}`}
                      disabled={occupied}
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <Calendar className="w-4 h-4 mr-2 shrink-0" />
                      <div className="text-left">
                        <span className="capitalize">
                          {format(date, "EEEE, dd/MM", { locale: ptBR })}
                        </span>
                        {occupied && (
                          <span className="block text-xs text-muted-foreground">
                            Vaga preenchida
                          </span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botão enviar */}
          {selectedDate && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={submitMutation.isPending}
              className="w-full"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Candidatar-se para {selectedMinistryName}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <div>
        <h3 className="font-semibold mb-3">Minhas Candidaturas de Serviço</h3>
        {minhasCandidaturas.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Você ainda não se candidatou para nenhum serviço</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {minhasCandidaturas.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
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
            <AlertDialogTitle>Confirmar candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está se candidatando para servir no ministério de <strong>{selectedMinistryName}</strong> no culto de{" "}
              <strong>{TIPOS_CULTO.find((t) => t.value === selectedTipoCulto)?.label}</strong> em{" "}
              <strong className="capitalize">{selectedDateFormatted}</strong>.
              <br /><br />
              Após enviar, sua candidatura será analisada pelo líder do ministério.
              Lembre-se: você pode se candidatar apenas 1 vez por mês para cada ministério.
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
