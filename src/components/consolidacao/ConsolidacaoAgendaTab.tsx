import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Loader2,
  CheckCircle,
  CalendarCheck,
  DollarSign,
  UserCheck,
  Heart,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CompartilharInscricaoDialog } from "@/components/agenda/CompartilharInscricaoDialog";

interface ConsolidacaoAgendaTabProps {
  onEventoSelect?: (eventoId: string, eventoTitulo: string) => void;
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  tipo_evento: string;
  cor: string | null;
  flyer_url: string | null;
  tem_custo: boolean | null;
  valor_custo: number | null;
  limite_vagas: number | null;
}

export const ConsolidacaoAgendaTab = ({ onEventoSelect }: ConsolidacaoAgendaTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [compartilharEvento, setCompartilharEvento] = useState<any>(null);
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos-consolidacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", false)
        .order("data_evento", { ascending: false });
      
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Buscar contagem de conversões por evento
  const { data: conversoesPorEvento = {} } = useQuery({
    queryKey: ["conversoes-por-evento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("evento_id")
        .not("evento_id", "is", null);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        counts[c.evento_id] = (counts[c.evento_id] || 0) + 1;
      });
      return counts;
    },
  });

  const tiposEvento = useMemo(() => {
    const tipos = new Set<string>();
    eventos.forEach((e) => tipos.add(e.tipo_evento));
    return Array.from(tipos);
  }, [eventos]);

  const eventosFiltrados = useMemo(() => {
    if (tipoFiltro === "todos") return eventos;
    return eventos.filter((e) => e.tipo_evento === tipoFiltro);
  }, [eventos, tipoFiltro]);

  const tipoEventoLabels: Record<string, string> = {
    culto: "Culto",
    ceia: "Santa Ceia",
    batismo: "Batismo",
    impacto: "Impacto",
    retiro: "Retiro",
    conferencia: "Conferência",
    casa_refugio: "Casa Refúgio",
    evento: "Evento",
    acao_evangelistica: "Ação Evangelística",
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl">Eventos e Conversões</h2>
          <p className="text-sm text-muted-foreground">
            Vincule novas conversões aos eventos para rastrear resultados
          </p>
        </div>
        
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tiposEvento.map((tipo) => (
              <SelectItem key={tipo} value={tipo}>
                {tipoEventoLabels[tipo] || tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {eventosFiltrados.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum evento encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventosFiltrados.map((evento) => {
            const dataEvento = parseISO(evento.data_evento);
            const conversoes = conversoesPorEvento[evento.id] || 0;
            
            return (
              <Card 
                key={evento.id} 
                className="overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                style={{
                  borderLeft: `4px solid ${evento.cor || "hsl(var(--destructive))"}`,
                }}
                onClick={() => onEventoSelect?.(evento.id, evento.titulo)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="flex flex-col items-center justify-center w-14 h-14 rounded-xl shadow-md"
                      style={{ 
                        backgroundColor: evento.cor || "hsl(var(--destructive))",
                        color: "white",
                      }}
                    >
                      <span className="text-xs font-medium uppercase">
                        {format(dataEvento, "MMM", { locale: ptBR })}
                      </span>
                      <span className="text-xl font-bold">
                        {format(dataEvento, "dd")}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-xs">
                        {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                      </Badge>
                      {conversoes > 0 && (
                        <Badge className="bg-green-600 text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          {conversoes} conversão(ões)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                    {evento.titulo}
                  </h3>
                  
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {evento.hora_inicio && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {evento.hora_inicio.substring(0, 5)}
                        </span>
                      </div>
                    )}
                    {evento.local && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{evento.local}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                    Clique para vincular novas conversões
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {compartilharEvento && (
        <CompartilharInscricaoDialog
          evento={compartilharEvento}
          open={!!compartilharEvento}
          onOpenChange={(open) => !open && setCompartilharEvento(null)}
        />
      )}
    </div>
  );
};
