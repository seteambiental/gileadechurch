import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, ExternalLink } from "lucide-react";
import { normalizeText } from "@/lib/text-utils";

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const HomepageProgramacaoTab = () => {
  const navigate = useNavigate();

  const { data: eventosRecorrentes, isLoading } = useQuery({
    queryKey: ["eventos-recorrentes-homepage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", true)
        .order("dia_semana", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Filtrar: próximos 7 dias, sem repetições, com deduplicação
  const eventosFiltrados = useMemo(() => {
    if (!eventosRecorrentes || eventosRecorrentes.length === 0) return [];

    const today = new Date();
    const todayDow = today.getDay();

    const next7DaysDow = new Set<number>();
    for (let i = 0; i < 7; i++) {
      next7DaysDow.add((todayDow + i) % 7);
    }

    // Filtrar apenas eventos com dia_semana definido e que caem nos próximos 7 dias
    const eventosDaSemana = eventosRecorrentes.filter(
      (e) => e.dia_semana != null && next7DaysDow.has(e.dia_semana)
    );

    // Deduplicação
    const ceiaEvento = eventosDaSemana.find((e) =>
      normalizeText(e.titulo).includes("ceia")
    );
    const quartaPCEvento = eventosDaSemana.find((e) =>
      normalizeText(e.titulo).includes("prestacao de contas")
    );

    const filtrados = eventosDaSemana.filter((e) => {
      const tituloNorm = normalizeText(e.titulo);
      if (ceiaEvento && tituloNorm.includes("celebracao") && e.dia_semana === ceiaEvento.dia_semana) {
        return false;
      }
      if (quartaPCEvento && e.id !== quartaPCEvento.id && tituloNorm.includes("proposito") && !tituloNorm.includes("prestacao") && e.dia_semana === quartaPCEvento.dia_semana) {
        return false;
      }
      return true;
    });

    // Remover duplicatas por título
    const vistos = new Set<string>();
    const unicos = filtrados.filter((e) => {
      const key = normalizeText(e.titulo);
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });

    // Ordenar por dia da semana relativo a hoje
    return [...unicos].sort((a, b) => {
      const diaA = ((a.dia_semana ?? 0) - todayDow + 7) % 7;
      const diaB = ((b.dia_semana ?? 0) - todayDow + 7) % 7;
      if (diaA !== diaB) return diaA - diaB;
      return (a.hora_inicio || "").localeCompare(b.hora_inicio || "");
    });
  }, [eventosRecorrentes]);

  // Agrupar por dia da semana
  const eventosAgrupados = eventosFiltrados.reduce((acc, evento) => {
    const dia = evento.dia_semana ?? 0;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(evento);
    return acc;
  }, {} as Record<number, typeof eventosFiltrados>);

  const formatHora = (hora: string | null) => {
    if (!hora) return "—";
    return hora.slice(0, 5);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Programação Semanal</h2>
          <p className="text-sm text-muted-foreground">
            Eventos recorrentes dos próximos 7 dias exibidos automaticamente na homepage
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/agenda")}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Gerenciar Agenda
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Como funciona
          </CardTitle>
          <CardDescription>
            A programação exibida na homepage vem automaticamente dos eventos recorrentes 
            cadastrados na Agenda, mostrando apenas os próximos 7 dias sem repetições. 
            Para alterar, adicione ou edite eventos recorrentes na página de Programação.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(eventosAgrupados).map(([dia, eventos]) => (
          <Card key={dia}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{diasSemana[parseInt(dia)]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {eventos?.map((evento) => (
                <div 
                  key={evento.id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{formatHora(evento.hora_inicio)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{evento.titulo}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {evento.tipo_evento}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {eventosFiltrados.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-semibold mb-2">Nenhum evento recorrente nos próximos 7 dias</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre eventos recorrentes na Agenda para que apareçam na programação da homepage
            </p>
            <Button onClick={() => navigate("/agenda")}>
              Ir para Agenda
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomepageProgramacaoTab;
