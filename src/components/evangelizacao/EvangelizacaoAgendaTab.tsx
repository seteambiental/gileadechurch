import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Loader2,
  CheckCircle,
  CalendarCheck,
  DollarSign,
  Users,
  Heart,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CompartilharInscricaoDialog } from "@/components/agenda/CompartilharInscricaoDialog";

interface EvangelizacaoAgendaTabProps {
  memberId?: string;
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

export const EvangelizacaoAgendaTab = ({ memberId }: EvangelizacaoAgendaTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [compartilharEvento, setCompartilharEvento] = useState<any>(null);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos-evangelizacao"],
    queryFn: async () => {
      const hoje = startOfDay(new Date()).toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", false)
        .gte("data_evento", hoje)
        .order("data_evento");
      
      if (error) throw error;
      
      // Filtrar eventos de evangelização
      const keywords = ["evangeliza", "alcance", "ação evangelística", "evangelism"];
      
      return (data as Evento[]).filter((evento) => {
        const titulo = evento.titulo.toLowerCase();
        const descricao = (evento.descricao || "").toLowerCase();
        const tipo = evento.tipo_evento.toLowerCase();
        return keywords.some((kw) => titulo.includes(kw) || descricao.includes(kw)) ||
               tipo === "acao_evangelistica";
      });
    },
  });

  // Buscar inscrições
  const { data: minhasInscricoes = [] } = useQuery({
    queryKey: ["minhas-inscricoes-evangelizacao", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select("evento_id")
        .eq("member_id", memberId);
      if (error) throw error;
      return data.map((i) => i.evento_id);
    },
    enabled: !!memberId,
  });

  const confirmarPresencaMutation = useMutation({
    mutationFn: async (eventoId: string) => {
      if (!memberId) throw new Error("Membro não identificado");
      
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("full_name, whatsapp")
        .eq("id", memberId)
        .single();
      
      if (memberError) throw memberError;
      
      const { error } = await supabase
        .from("inscricoes_eventos")
        .insert({
          evento_id: eventoId,
          member_id: memberId,
          nome_participante: member.full_name,
          telefone_contato: member.whatsapp || "",
          status_pagamento: "confirmado",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minhas-inscricoes-evangelizacao", memberId] });
      toast.success("Presença confirmada!");
    },
    onError: () => {
      toast.error("Erro ao confirmar presença");
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
        <h2 className="font-heading font-bold text-xl">Agenda de Evangelização</h2>
        <p className="text-sm text-muted-foreground">
          Ações evangelísticas e eventos de alcance
        </p>
      </div>

      {eventos.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhuma ação evangelística programada
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => {
            const dataEvento = parseISO(evento.data_evento);
            const jaInscrito = minhasInscricoes.includes(evento.id);
            const temCusto = evento.tem_custo;
            
            return (
              <Card 
                key={evento.id} 
                className="overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                style={{
                  borderLeft: `4px solid ${evento.cor || "hsl(var(--destructive))"}`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                
                {evento.flyer_url && (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={evento.flyer_url}
                      alt={evento.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  </div>
                )}
                
                <CardContent className={`p-4 ${evento.flyer_url ? '-mt-4 relative z-10' : ''}`}>
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
                    
                    <div className="flex gap-1">
                      {temCusto && (
                        <Badge variant="outline" className="text-xs">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {evento.valor_custo ? `R$ ${evento.valor_custo}` : "Pago"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                    {evento.titulo}
                  </h3>
                  
                  <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                    {evento.hora_inicio && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {evento.hora_inicio.substring(0, 5)}
                          {evento.hora_fim && ` - ${evento.hora_fim.substring(0, 5)}`}
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

                  <div className="flex items-center gap-2">
                    {jaInscrito ? (
                      <Button variant="secondary" size="sm" className="flex-1 gap-1" disabled>
                        <CheckCircle className="w-4 h-4" />
                        Inscrito
                      </Button>
                    ) : temCusto ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => navigate(`/inscricao/${evento.id}`)}
                      >
                        <CalendarCheck className="w-4 h-4" />
                        Inscrever
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => confirmarPresencaMutation.mutate(evento.id)}
                        disabled={confirmarPresencaMutation.isPending}
                      >
                        {confirmarPresencaMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CalendarCheck className="w-4 h-4" />
                        )}
                        Participar
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCompartilharEvento({
                        id: evento.id,
                        titulo: evento.titulo,
                        data_evento: evento.data_evento,
                        hora_inicio: evento.hora_inicio,
                        local: evento.local,
                        flyer_url: evento.flyer_url,
                        cor: evento.cor,
                      })}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
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
