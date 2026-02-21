import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Home,
  User,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { calculateAge } from "@/lib/age-utils";
import { ptBR } from "date-fns/locale";

interface EscalasServicoTabProps {
  ministryId: string;
  ministrySlug: string; // "recepcao" or "estacionamento"
}

interface EscalaServico {
  id: string;
  data_culto: string;
  tipo_culto: string;
  tipo_escala: string;
  member_id: string | null;
  casa_refugio_id: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  member?: { id: string; full_name: string } | null;
  casa_refugio?: { id: string; name: string } | null;
  membros?: { id: string; member: { id: string; full_name: string } }[];
}

const TIPOS_CULTO = [
  { value: "celebracao", label: "Celebração (Domingo)" },
  { value: "ceia", label: "Ceia (Domingo)" },
  { value: "quarta", label: "Quarta com Propósito" },
];

const STATUS_CONFIG: Record<string, { label: string; variant: "outline" | "default" | "destructive"; icon: typeof Clock }> = {
  pendente: { label: "Pendente", variant: "outline", icon: Clock },
  aprovado: { label: "Aprovado", variant: "default", icon: CheckCircle },
  rejeitado: { label: "Rejeitado", variant: "destructive", icon: XCircle },
};

export const EscalasServicoTab = ({ ministryId, ministrySlug }: EscalasServicoTabProps) => {
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [approveDialogId, setApproveDialogId] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);

  const isEstacionamento = ministrySlug === "estacionamento";

  // Fetch escalas do mês
  const { data: escalas = [], isLoading } = useQuery({
    queryKey: ["escalas-servico", ministryId, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("escalas_servico")
        .select(`
          id,
          data_culto,
          tipo_culto,
          tipo_escala,
          member_id,
          casa_refugio_id,
          status,
          observacoes,
          created_at,
          member:members!escalas_servico_member_id_fkey(id, full_name),
          casa_refugio:casas_refugio!escalas_servico_casa_refugio_id_fkey(id, name),
          membros:escala_servico_membros(
            id,
            member:members(id, full_name)
          )
        `)
        .eq("ministry_id", ministryId)
        .gte("data_culto", start)
        .lte("data_culto", end)
        .order("data_culto")
        .order("tipo_culto");

      if (error) throw error;
      return data as unknown as EscalaServico[];
    },
  });

  // Filtrar por status
  const filteredEscalas = useMemo(() => {
    if (filterStatus === "todos") return escalas;
    return escalas.filter((e) => e.status === filterStatus);
  }, [escalas, filterStatus]);

  // Agrupar por data
  const escalasByDate = useMemo(() => {
    const grouped: Record<string, EscalaServico[]> = {};
    filteredEscalas.forEach((escala) => {
      if (!grouped[escala.data_culto]) {
        grouped[escala.data_culto] = [];
      }
      grouped[escala.data_culto].push(escala);
    });
    return grouped;
  }, [filteredEscalas]);

  // Aprovar candidatura
  const approveMutation = useMutation({
    mutationFn: async (escalaId: string) => {
      const escala = escalas.find((e) => e.id === escalaId);
      if (!escala) throw new Error("Escala não encontrada");

      // Atualizar status
      const { error: updateError } = await supabase
        .from("escalas_servico")
        .update({ status: "aprovado" })
        .eq("id", escalaId);
      if (updateError) throw updateError;

      // Se for candidatura de Casa Refúgio, popular os membros
      if (escala.tipo_escala === "casa_refugio" && escala.casa_refugio_id) {
        const { data: membrosVinculados, error: mvError } = await supabase
          .from("members")
          .select("id, genero, birth_date")
          .eq("casa_refugio_id", escala.casa_refugio_id);
        if (mvError) throw mvError;

        let membrosParaEscalar = membrosVinculados || [];
        if (isEstacionamento) {
          membrosParaEscalar = membrosParaEscalar.filter((m) => {
            if (m.genero !== "masculino") return false;
            const { years } = calculateAge(m.birth_date);
            if (m.birth_date && years < 14) return false;
            return true;
          });
        }

        if (membrosParaEscalar.length > 0) {
          const membrosData = membrosParaEscalar.map((m) => ({
            escala_id: escalaId,
            member_id: m.id,
          }));

          const { error: insertError } = await supabase
            .from("escala_servico_membros")
            .insert(membrosData);
          if (insertError) throw insertError;
        }
      }

      // Se for candidatura individual, adicionar o membro
      if (escala.tipo_escala === "individual" && escala.member_id) {
        const { error: insertError } = await supabase
          .from("escala_servico_membros")
          .insert({ escala_id: escalaId, member_id: escala.member_id });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas-servico", ministryId] });
      toast.success("Candidatura aprovada!");
      setApproveDialogId(null);
    },
    onError: () => toast.error("Erro ao aprovar candidatura"),
  });

  // Rejeitar candidatura
  const rejectMutation = useMutation({
    mutationFn: async (escalaId: string) => {
      const { error } = await supabase
        .from("escalas_servico")
        .update({ status: "rejeitado" })
        .eq("id", escalaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas-servico", ministryId] });
      toast.success("Candidatura rejeitada");
      setRejectDialogId(null);
    },
    onError: () => toast.error("Erro ao rejeitar candidatura"),
  });

  // Contagem de pendentes
  const pendingCount = escalas.filter((e) => e.status === "pendente").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-32 text-center capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <Clock className="w-3 h-3" />
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovado">Aprovados</SelectItem>
              <SelectItem value="rejeitado">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(escalasByDate).length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma escala de serviço neste mês</p>
            <p className="text-xs mt-1">As candidaturas aparecerão aqui para aprovação</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(escalasByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dateEscalas]) => (
              <Card key={date}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {format(parseLocalDate(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dateEscalas.map((escala) => {
                    const statusConf = STATUS_CONFIG[escala.status] || STATUS_CONFIG.pendente;
                    const StatusIcon = statusConf.icon;

                    return (
                      <div key={escala.id} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {TIPOS_CULTO.find((t) => t.value === escala.tipo_culto)?.label || escala.tipo_culto}
                              </Badge>
                              <Badge variant={statusConf.variant} className="gap-1 text-xs">
                                <StatusIcon className="w-3 h-3" />
                                {statusConf.label}
                              </Badge>
                              <Badge variant="secondary" className="gap-1 text-xs">
                                {escala.tipo_escala === "individual" ? (
                                  <><User className="w-3 h-3" /> Individual</>
                                ) : (
                                  <><Home className="w-3 h-3" /> Casa Refúgio</>
                                )}
                              </Badge>
                            </div>

                            {/* Candidato */}
                            <div className="text-sm font-medium mt-1">
                              {escala.tipo_escala === "individual" && escala.member?.full_name && (
                                <span>{escala.member.full_name}</span>
                              )}
                              {escala.tipo_escala === "casa_refugio" && escala.casa_refugio?.name && (
                                <span>CR {escala.casa_refugio.name}</span>
                              )}
                            </div>

                            {/* Membros escalados (quando aprovado) */}
                            {escala.status === "aprovado" && escala.membros && escala.membros.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <Users className="w-3 h-3 text-muted-foreground mt-0.5" />
                                {escala.membros.map((m) => (
                                  <Badge key={m.id} variant="outline" className="text-xs font-normal">
                                    {m.member?.full_name}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {escala.observacoes && (
                              <p className="text-xs text-muted-foreground italic mt-1">{escala.observacoes}</p>
                            )}
                          </div>

                          {/* Ações de aprovação */}
                          {escala.status === "pendente" && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700 h-8 w-8"
                                onClick={() => setApproveDialogId(escala.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                onClick={() => setRejectDialogId(escala.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Aprovar dialog */}
      <AlertDialog open={!!approveDialogId} onOpenChange={(o) => !o && setApproveDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              {escalas.find((e) => e.id === approveDialogId)?.tipo_escala === "casa_refugio"
                ? `Os membros da Casa Refúgio serão automaticamente adicionados à escala${isEstacionamento ? " (apenas homens)" : ""}.`
                : "O membro será adicionado à escala de serviço para esta data."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => approveDialogId && approveMutation.mutate(approveDialogId)}
            >
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejeitar dialog */}
      <AlertDialog open={!!rejectDialogId} onOpenChange={(o) => !o && setRejectDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              A candidatura será marcada como rejeitada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => rejectDialogId && rejectMutation.mutate(rejectDialogId)}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
