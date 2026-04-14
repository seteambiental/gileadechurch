import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, CalendarDays } from "lucide-react";

interface ImpactoEventosTabProps {
  onGoToInscricoes?: (eventoId: string) => void;
  onGoToFinanceiro?: (eventoId: string) => void;
}

const ImpactoEventosTab = ({ onGoToInscricoes, onGoToFinanceiro }: ImpactoEventosTabProps) => {
  const { data: finalizadosIds = [] } = useQuery({
    queryKey: ["impacto-eventos-finalizados-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id")
        .eq("finalizado", true);
      if (error) throw error;
      return (data || []).map((e) => e.id);
    },
  });

  const { data: eventosAgenda = [], isLoading } = useQuery({
    queryKey: ["agenda-eventos-inscricao", finalizadosIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim, local, limite_vagas, ativo, necessita_inscricao")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      const finalizadosSet = new Set(finalizadosIds);
      return (data || []).filter((e) => {
        if (finalizadosSet.has(e.id)) return false;
        const norm = (e.titulo || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return !norm.includes("teologia");
      });
    },
  });

  const { data: inscricoesAgendaCount } = useQuery({
    queryKey: ["impacto-inscricoes-count"],
    queryFn: async () => {
      const [{ data: impactoData, error: impactoError }, { data: agendaPendentes, error: agendaError }] = await Promise.all([
        supabase.from("impacto_inscricoes").select("evento_id, member_id, nome"),
        supabase
          .from("inscricoes_eventos")
          .select("evento_id, member_id, nome_participante")
          .eq("aprovado", false),
      ]);

      if (impactoError) throw impactoError;
      if (agendaError) throw agendaError;

      const normalize = (value: string | null | undefined) =>
        (value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

      const impactoByEvent = new Map<string, { memberIds: Set<string>; nomes: Set<string>; count: number }>();

      (impactoData || []).forEach((row) => {
        const eventId = row.evento_id;
        if (!eventId) return;
        if (!impactoByEvent.has(eventId)) {
          impactoByEvent.set(eventId, { memberIds: new Set(), nomes: new Set(), count: 0 });
        }
        const eventState = impactoByEvent.get(eventId)!;
        if (row.member_id) eventState.memberIds.add(row.member_id);
        const nomeNorm = normalize(row.nome);
        if (nomeNorm) eventState.nomes.add(nomeNorm);
        eventState.count += 1;
      });

      (agendaPendentes || []).forEach((row) => {
        const eventId = row.evento_id;
        if (!eventId) return;
        if (!impactoByEvent.has(eventId)) {
          impactoByEvent.set(eventId, { memberIds: new Set(), nomes: new Set(), count: 0 });
        }
        const eventState = impactoByEvent.get(eventId)!;

        if (row.member_id && eventState.memberIds.has(row.member_id)) return;
        const nomeNorm = normalize(row.nome_participante);
        if (nomeNorm && eventState.nomes.has(nomeNorm)) return;

        if (row.member_id) eventState.memberIds.add(row.member_id);
        if (nomeNorm) eventState.nomes.add(nomeNorm);
        eventState.count += 1;
      });

      const counts: Record<string, number> = {};
      impactoByEvent.forEach((value, key) => {
        counts[key] = value.count;
      });

      return counts;
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-heading font-bold">Eventos com Inscrição</h2>
      {eventosAgenda.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum evento com inscrição cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventosAgenda.map((evento) => {
            const inscritos = inscricoesAgendaCount?.[evento.id] || 0;
            const dataFormatada = format(parseLocalDate(evento.data_evento), "dd/MM/yyyy", { locale: ptBR });
            const dataFimFormatada = evento.data_fim
              ? format(parseLocalDate(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })
              : null;

            return (
              <Card key={evento.id} className="flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight">{evento.titulo}</h3>
                    <Badge variant={evento.ativo ? "outline" : "secondary"} className="text-xs shrink-0">
                      {evento.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{dataFormatada}{dataFimFormatada ? ` - ${dataFimFormatada}` : ""}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{inscritos} inscritos{evento.limite_vagas ? ` / ${evento.limite_vagas} vagas` : ""}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => onGoToInscricoes?.(evento.id)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      Inscrições
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => onGoToFinanceiro?.(evento.id)}
                    >
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      Financeiro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImpactoEventosTab;
