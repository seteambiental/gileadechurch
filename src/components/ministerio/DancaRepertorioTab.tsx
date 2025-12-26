import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Music, Video, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DancaRepertorioTabProps {
  ministryId: string;
}

interface Musica {
  id: string;
  escala_id: string;
  ministry_id: string;
  titulo: string;
  artista: string | null;
  tom: string | null;
  video_url: string | null;
  ordem: number;
  observacoes: string | null;
}

interface Escala {
  id: string;
  data_culto: string;
  tipo_culto: string;
}

interface Compartilhamento {
  id: string;
  escala_id: string;
  compartilhado_em: string;
  visualizado: boolean;
  escala: Escala;
}

const TIPOS_CULTO_MAP: Record<string, string> = {
  domingo: "Domingo",
  quarta: "Quarta-feira",
  especial: "Especial",
  evento: "Evento",
};

export const DancaRepertorioTab = ({ ministryId }: DancaRepertorioTabProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch compartilhamentos recebidos para este ministério
  const { data: compartilhamentos = [] } = useQuery({
    queryKey: ["danca-compartilhamentos", ministryId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_escalas_compartilhadas")
        .select(`
          id,
          escala_id,
          compartilhado_em,
          visualizado,
          escala:ministerio_escalas(id, data_culto, tipo_culto)
        `)
        .eq("ministry_destino_id", ministryId)
        .gte("compartilhado_em", format(monthStart, "yyyy-MM-dd"))
        .lte("compartilhado_em", format(monthEnd, "yyyy-MM-dd") + "T23:59:59")
        .order("compartilhado_em", { ascending: false });
      if (error) throw error;
      return data as unknown as Compartilhamento[];
    },
  });

  // Get all escala IDs
  const escalaIds = useMemo(() => 
    compartilhamentos.map(c => c.escala_id).filter(Boolean),
    [compartilhamentos]
  );

  // Fetch repertório das escalas compartilhadas
  const { data: repertorio = [] } = useQuery({
    queryKey: ["danca-repertorio", escalaIds],
    queryFn: async () => {
      if (escalaIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("ministerio_repertorio")
        .select("*")
        .in("escala_id", escalaIds)
        .order("ordem");
      if (error) throw error;
      return data as Musica[];
    },
    enabled: escalaIds.length > 0,
  });

  // Agrupar músicas por escala
  const musicasByEscala = useMemo(() => {
    const grouped: Record<string, Musica[]> = {};
    repertorio.forEach(m => {
      if (!grouped[m.escala_id]) grouped[m.escala_id] = [];
      grouped[m.escala_id].push(m);
    });
    return grouped;
  }, [repertorio]);

  // Marcar como visualizado
  const handleMarcarVisualizado = async (compartilhamentoId: string) => {
    await supabase
      .from("ministerio_escalas_compartilhadas")
      .update({ visualizado: true, visualizado_em: new Date().toISOString() })
      .eq("id", compartilhamentoId);
  };

  return (
    <div className="space-y-4">
      {/* Navegação do mês */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-medium text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Mensagem explicativa */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Aqui você visualiza o repertório compartilhado pelo Ministério de Louvor para preparação das coreografias.
          </p>
        </CardContent>
      </Card>

      {/* Lista de repertórios compartilhados */}
      {compartilhamentos.length === 0 ? (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-8 text-center">
            <Music className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Nenhum repertório compartilhado neste mês
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O Ministério de Louvor pode compartilhar o repertório com a Dança
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {compartilhamentos.map((comp) => {
            const escala = comp.escala;
            if (!escala) return null;
            
            const musicas = musicasByEscala[escala.id] || [];
            
            return (
              <Card key={comp.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <CardTitle className="text-base">
                        {format(new Date(escala.data_culto), "dd/MM/yyyy")} - {TIPOS_CULTO_MAP[escala.tipo_culto] || escala.tipo_culto}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!comp.visualizado && (
                        <Badge variant="default" className="text-xs">
                          Novo
                        </Badge>
                      )}
                      {!comp.visualizado && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarVisualizado(comp.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Marcar como visto
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {musicas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem músicas cadastradas</p>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">
                        {musicas.map((musica, index) => (
                          <div
                            key={musica.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-muted-foreground w-6">
                                {index + 1}.
                              </span>
                              <div>
                                <p className="font-medium text-foreground">{musica.titulo}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {musica.artista && <span>{musica.artista}</span>}
                                  {musica.tom && (
                                    <Badge variant="outline" className="text-xs">
                                      Tom: {musica.tom}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {musica.video_url && (
                              <a
                                href={musica.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Video className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
