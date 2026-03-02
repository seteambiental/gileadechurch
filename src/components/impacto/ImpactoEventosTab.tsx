import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ImpactoEventosTab = () => {
  const { data: eventosAgenda = [], isLoading } = useQuery({
    queryKey: ["agenda-eventos-inscricao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim, local, limite_vagas, ativo, necessita_inscricao")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Count using the same source logic as the Inscrições tab:
  // impacto_inscricoes + pendentes de inscricoes_eventos (sem duplicar por member_id/nome)
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Inscritos</TableHead>
                  <TableHead className="text-center">Vagas</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventosAgenda.map((evento) => {
                  const inscritos = inscricoesAgendaCount?.[evento.id] || 0;
                  return (
                    <TableRow key={evento.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(parseLocalDate(evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                        {evento.data_fim && (
                          <span className="text-muted-foreground"> - {format(parseLocalDate(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                      </TableCell>
                      <TableCell>{evento.titulo}</TableCell>
                      <TableCell className="text-center">{inscritos}</TableCell>
                      <TableCell className="text-center">{evento.limite_vagas || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={evento.ativo ? "outline" : "secondary"} className="text-xs">
                          {evento.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImpactoEventosTab;
