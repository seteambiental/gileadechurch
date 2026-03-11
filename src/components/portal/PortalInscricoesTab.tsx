import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarDays, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const PortalInscricoesTab = () => {
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["portal-inscricoes-eventos"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, descricao, data_evento, data_fim, hora_inicio, tipo_evento, cor, flyer_url, necessita_inscricao, limite_vagas")
        .eq("ativo", true)
        .eq("status", "aprovado")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .gte("data_evento", today)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

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
        <h2 className="font-heading font-bold text-xl">Inscrições Abertas</h2>
        <p className="text-sm text-muted-foreground">
          Eventos com inscrições disponíveis
        </p>
      </div>

      {eventos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhum evento com inscrição aberta no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {eventos.map((evento) => (
            <Card key={evento.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex gap-3">
                  {evento.flyer_url && (
                    <img
                      src={evento.flyer_url}
                      alt={evento.titulo}
                      className="w-24 h-24 sm:w-32 sm:h-32 object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 py-3 pr-3 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base leading-tight">{evento.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(evento.data_evento + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}
                        {evento.hora_inicio && ` • ${evento.hora_inicio.substring(0, 5)}`}
                      </p>
                      {evento.limite_vagas && (
                        <Badge variant="outline" className="text-[10px] mt-1">
                          {evento.limite_vagas} vagas
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2 self-start"
                      onClick={() => window.open(`/inscricao/${evento.id}`, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Inscrever-se
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
