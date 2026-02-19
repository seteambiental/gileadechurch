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

  const { data: inscricoesAgendaCount } = useQuery({
    queryKey: ["inscricoes-eventos-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("evento_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((i) => {
        counts[i.evento_id] = (counts[i.evento_id] || 0) + 1;
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
