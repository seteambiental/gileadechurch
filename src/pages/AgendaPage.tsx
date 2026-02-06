import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowLeft,
  Loader2,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Link,
  Users,
  BarChart3,
  CalendarDays,
  PartyPopper,
  Trash2,
  Edit,
  Share2,
} from "lucide-react";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { useToast } from "@/hooks/use-toast";
import { EventoFormDialog } from "@/components/agenda/EventoFormDialog";
import { InscricoesEventoDialog } from "@/components/agenda/InscricoesEventoDialog";
import { InscricoesDashboard } from "@/components/agenda/InscricoesDashboard";
import { CompartilharInscricaoDialog } from "@/components/agenda/CompartilharInscricaoDialog";
 import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  genero_alvo: string;
  cor: string | null;
  recorrente: boolean;
  tipo_recorrencia: string | null;
  dia_semana: number | null;
  semana_mes: number | null;
  flyer_url: string | null;
  observacoes: string | null;
  ativo: boolean;
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

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const AgendaPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const bypass = isAuthBypassed();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("indicadores");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [formMode, setFormMode] = useState<"evento" | "compromisso">("evento");
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [inscricoesEvento, setInscricoesEvento] = useState<{ id: string; titulo: string; local?: string | null; data_evento?: string; limite_vagas?: number | null } | null>(null);
  const [compartilharEvento, setCompartilharEvento] = useState<{ 
    id: string; 
    titulo: string; 
    data_evento: string;
    hora_inicio?: string | null;
    local?: string | null;
    flyer_url?: string | null;
    cor?: string | null;
  } | null>(null);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<Evento | null>(null);

  const excluirEventoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agenda_igreja").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-eventos"] });
      toast({ title: "Evento excluído com sucesso" });
      setEventoParaExcluir(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir evento", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user && !bypass) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate, bypass]);

  // Query para eventos recorrentes (programação)
  const { data: eventosRecorrentes = [], isLoading: loadingRecorrentes } = useQuery({
    queryKey: ["agenda-recorrentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("ativo", true)
        .eq("recorrente", true)
        .order("dia_semana", { ascending: true });
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Query para eventos únicos (eventos) - ordenados por data crescente
  const { data: eventosUnicos = [], isLoading: loadingUnicos } = useQuery({
    queryKey: ["agenda-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("recorrente", false)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data as Evento[];
    },
  });

  // Agrupar eventos recorrentes por dia da semana
  const eventosAgrupados = eventosRecorrentes.reduce((acc, evento) => {
    const dia = evento.dia_semana ?? 0;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(evento);
    return acc;
  }, {} as Record<number, Evento[]>);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-destructive animate-spin" />
      </div>
    );
  }

  if (!user && !bypass) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoGileade} alt="Gileade" className="w-10 h-10 rounded-full object-cover shadow-red" />
            <div>
              <h1 className="font-heading font-bold text-lg text-foreground">Agenda da Igreja</h1>
              <p className="text-xs text-muted-foreground">Programação e Eventos</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="indicadores" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Indicadores</span>
            </TabsTrigger>
            <TabsTrigger value="programacao" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Programação</span>
            </TabsTrigger>
            <TabsTrigger value="eventos" className="gap-2">
              <PartyPopper className="w-4 h-4" />
              <span className="hidden sm:inline">Eventos</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Indicadores */}
          <TabsContent value="indicadores" className="space-y-6">
            <InscricoesDashboard />
          </TabsContent>

          {/* Aba Programação */}
          <TabsContent value="programacao" className="space-y-6">
             <AgendaCalendar
               eventos={[...eventosRecorrentes, ...eventosUnicos]}
               onEventoClick={(evento) => {
                 const isRecorrente = evento.recorrente;
                 setEditingEvento(evento as Evento);
                 setFormMode(isRecorrente ? "compromisso" : "evento");
                 setShowEventoForm(true);
               }}
               onNovoCompromisso={() => {
                setEditingEvento(null);
                setFormMode("compromisso");
                setShowEventoForm(true);
               }}
               isLoading={loadingRecorrentes || loadingUnicos}
             />
          </TabsContent>

          {/* Aba Eventos */}
          <TabsContent value="eventos" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-heading font-bold text-xl">Eventos</h2>
                <p className="text-sm text-muted-foreground">Conferências, retiros, impactos e mais</p>
              </div>
              <Button variant="secondary" onClick={() => {
                setEditingEvento(null);
                setFormMode("evento");
                setShowEventoForm(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>
            </div>

            {loadingUnicos ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : eventosUnicos.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <PartyPopper className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-semibold mb-2">Nenhum evento cadastrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie eventos especiais como conferências e retiros
                  </p>
                  <Button variant="secondary" onClick={() => {
                    setEditingEvento(null);
                    setFormMode("evento");
                    setShowEventoForm(true);
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Evento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {eventosUnicos.map((evento) => {
                  const dataEvento = parseISO(evento.data_evento);
                  const isPast = dataEvento < new Date();
                  
                  return (
                    <Card 
                      key={evento.id} 
                      className={`overflow-hidden group hover:shadow-lg transition-all duration-300 ${!evento.ativo ? "opacity-60" : ""}`}
                      style={{
                        borderLeft: `4px solid ${evento.cor || "hsl(var(--destructive))"}`,
                      }}
                    >
                      {evento.flyer_url && (
                        <div className="aspect-[16/9] overflow-hidden">
                          <img 
                            src={evento.flyer_url} 
                            alt={evento.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      
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
                            <Badge variant={evento.ativo ? "outline" : "secondary"} className="text-xs">
                              {evento.ativo ? (tipoEventoLabels[evento.tipo_evento] || evento.tipo_evento) : "Inativo"}
                            </Badge>
                            {isPast && evento.ativo && (
                              <Badge variant="secondary" className="text-xs">Encerrado</Badge>
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
                              <span>{evento.hora_inicio.substring(0, 5)}</span>
                            </div>
                          )}
                          {evento.local && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{evento.local}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setEditingEvento(evento);
                              setFormMode("evento");
                              setShowEventoForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInscricoesEvento({ 
                              id: evento.id, 
                              titulo: evento.titulo,
                              local: evento.local,
                              data_evento: evento.data_evento,
                              limite_vagas: evento.limite_vagas
                            })}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setEventoParaExcluir(evento)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <EventoFormDialog
        open={showEventoForm}
        onOpenChange={setShowEventoForm}
        evento={editingEvento}
        selectedDate={selectedDate}
        mode={formMode}
      />

      {inscricoesEvento && (
        <InscricoesEventoDialog
          open={!!inscricoesEvento}
          onOpenChange={(open) => !open && setInscricoesEvento(null)}
          eventoId={inscricoesEvento.id}
          eventoTitulo={inscricoesEvento.titulo}
          eventoLocal={inscricoesEvento.local}
          eventoData={inscricoesEvento.data_evento}
          limiteVagas={inscricoesEvento.limite_vagas}
        />
      )}

      {compartilharEvento && (
        <CompartilharInscricaoDialog
          open={!!compartilharEvento}
          onOpenChange={(open) => !open && setCompartilharEvento(null)}
          evento={compartilharEvento}
        />
      )}

      <AlertDialog open={!!eventoParaExcluir} onOpenChange={(open) => !open && setEventoParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{eventoParaExcluir?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => eventoParaExcluir && excluirEventoMutation.mutate(eventoParaExcluir.id)}
            >
              {excluirEventoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgendaPage;
