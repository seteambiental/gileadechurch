import { useState, useMemo } from "react";
import { todayDateStr } from "@/lib/date-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CompartilharInscricaoDialog } from "@/components/agenda/CompartilharInscricaoDialog";

interface MinisterioAgendaTabProps {
  ministerioSlug: string;
  ministerioTitle: string;
  memberId?: string;
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  data_fim: string | null;
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

const tipoEventoLabels: Record<string, string> = {
  culto: "Culto",
  ceia: "Santa Ceia",
  batismo: "Batismo",
  impacto: "Impacto",
  retiro: "Retiro",
  conferencia: "Conferência",
  casa_refugio: "Casa Refúgio",
  evento: "Evento",
};

export const MinisterioAgendaTab = ({ ministerioSlug, ministerioTitle, memberId }: MinisterioAgendaTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [compartilharEvento, setCompartilharEvento] = useState<{
    id: string;
    titulo: string;
    data_evento: string;
    hora_inicio?: string | null;
    local?: string | null;
    flyer_url?: string | null;
    cor?: string | null;
  } | null>(null);

  // Mapeia o slug do ministério para o valor de genero_alvo em agenda_igreja
  const getGeneroAlvo = (): string | null => {
    switch (ministerioSlug) {
      case "true-man":
      case "homens":
        return "homens";
      case "mulheres":
        return "mulheres";
      case "flow":
        return "jovens";
      case "gt":
        return "adolescentes";
      default:
        return null;
    }
  };

  // Fallback por palavras-chave no título/descrição (para ministérios sem genero_alvo)
  const getMinisterioKeywords = () => {
    switch (ministerioSlug) {
      case "flow":
        return ["jovem", "jovens", "youth", "flow"];
      case "gt":
        return ["adolescente", "adolescentes", "teens", "gt"];
      default:
        return [];
    }
  };

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos-ministerio", ministerioSlug],
    queryFn: async () => {
      const hoje = todayDateStr();
      const generoAlvo = getGeneroAlvo();

      let query = supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", false)
        .gte("data_evento", hoje)
        .order("data_evento");

      // Se o ministério tem público-alvo definido, filtra direto pelo campo
      if (generoAlvo) {
        query = query.eq("genero_alvo", generoAlvo);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (generoAlvo) {
        return data as Evento[];
      }

      // Fallback: filtra por palavras-chave para slugs sem mapeamento direto
      const keywords = getMinisterioKeywords();
      if (keywords.length === 0) return [] as Evento[];
      return (data as Evento[]).filter((evento) => {
        const titulo = evento.titulo.toLowerCase();
        const descricao = (evento.descricao || "").toLowerCase();
        return keywords.some((kw) => titulo.includes(kw) || descricao.includes(kw));
      });
    },
  });

  // Buscar inscrições existentes do membro
  const { data: minhasInscricoes = [] } = useQuery({
    queryKey: ["minhas-inscricoes-ministerio", memberId],
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

  // Confirmar presença (para eventos sem custo)
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
      queryClient.invalidateQueries({ queryKey: ["minhas-inscricoes-ministerio", memberId] });
      toast.success("Presença confirmada!");
    },
    onError: (error) => {
      console.error("Erro ao confirmar presença:", error);
      toast.error("Erro ao confirmar presença");
    },
  });

  const isInscrito = (eventoId: string) => minhasInscricoes.includes(eventoId);

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
        <h2 className="font-heading font-bold text-xl">Agenda {ministerioTitle}</h2>
        <p className="text-sm text-muted-foreground">
          Eventos e atividades do ministério
        </p>
      </div>

      {eventos.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum evento programado para {ministerioTitle}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => {
            const dataEvento = parseLocalDate(evento.data_evento);
            const jaInscrito = isInscrito(evento.id);
            const temCusto = evento.tem_custo;
            
            return (
              <Card 
                key={evento.id} 
                className="overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)`,
                  borderLeft: `4px solid ${evento.cor || "hsl(var(--destructive))"}`,
                }}
              >
                {/* Efeito 3D */}
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
                  {/* Data Badge */}
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
                      {evento.limite_vagas && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {evento.limite_vagas}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Título e Info */}
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

                  {/* Badge do tipo */}
                  <Badge variant="outline" className="text-xs mb-4">
                    {tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento}
                  </Badge>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {jaInscrito ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 gap-1"
                        disabled
                      >
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
                        Confirmar Presença
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
