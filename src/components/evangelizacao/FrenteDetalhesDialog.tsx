import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Heart, 
  Edit2, 
  Trash2, 
  Loader2,
  BarChart3,
  CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EventoFormDialog } from "./EventoFormDialog";
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

interface Frente {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Evento {
  id: string;
  frente_id: string;
  nome: string;
  data_evento: string;
  local: string | null;
  descricao: string | null;
  vidas_alcancadas: number;
  decisoes: number;
  observacoes: string | null;
}

interface FrenteDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frente: Frente;
}

export function FrenteDetalhesDialog({ open, onOpenChange, frente }: FrenteDetalhesDialogProps) {
  const queryClient = useQueryClient();
  const [isEventoFormOpen, setIsEventoFormOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [eventoToDelete, setEventoToDelete] = useState<Evento | null>(null);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["evangelizacao-eventos", frente.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evangelizacao_eventos")
        .select("*")
        .eq("frente_id", frente.id)
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data as Evento[];
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evangelizacao_eventos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-eventos"] });
      toast.success("Evento excluído!");
      setEventoToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao excluir evento");
    },
  });

  const handleEditEvento = (evento: Evento) => {
    setSelectedEvento(evento);
    setIsEventoFormOpen(true);
  };

  const totalVidas = eventos?.reduce((acc, e) => acc + e.vidas_alcancadas, 0) || 0;
  const totalDecisoes = eventos?.reduce((acc, e) => acc + e.decisoes, 0) || 0;
  const totalEventos = eventos?.length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {frente.nome}
            </DialogTitle>
            {frente.descricao && (
              <p className="text-sm text-muted-foreground">{frente.descricao}</p>
            )}
          </DialogHeader>

          <Tabs defaultValue="eventos" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="eventos" className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Eventos
              </TabsTrigger>
              <TabsTrigger value="relatorio" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Relatório
              </TabsTrigger>
            </TabsList>

            <TabsContent value="eventos" className="flex-1 overflow-auto mt-4">
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedEvento(null);
                      setIsEventoFormOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Evento
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : eventos?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum evento cadastrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventos?.map((evento) => (
                      <Card key={evento.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{evento.nome}</h4>
                              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                {evento.local && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {evento.local}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-3 pt-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Users className="w-3 h-3 mr-1" />
                                  {evento.vidas_alcancadas} vidas
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Heart className="w-3 h-3 mr-1" />
                                  {evento.decisoes} decisões
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEvento(evento)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEventoToDelete(evento)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="relatorio" className="flex-1 overflow-auto mt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/10 border-primary/20">
                  <CardContent className="pt-6 text-center">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold text-primary">{totalEventos}</p>
                    <p className="text-sm text-muted-foreground">Eventos Realizados</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/10 border-secondary/20">
                  <CardContent className="pt-6 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-secondary" />
                    <p className="text-3xl font-bold text-secondary">{totalVidas}</p>
                    <p className="text-sm text-muted-foreground">Vidas Alcançadas</p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/10 border-destructive/20">
                  <CardContent className="pt-6 text-center">
                    <Heart className="w-8 h-8 mx-auto mb-2 text-destructive" />
                    <p className="text-3xl font-bold text-destructive">{totalDecisoes}</p>
                    <p className="text-sm text-muted-foreground">Decisões por Cristo</p>
                  </CardContent>
                </Card>
              </div>

              {eventos && eventos.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Histórico de Eventos</h4>
                  <div className="space-y-2">
                    {eventos.map((evento) => (
                      <div
                        key={evento.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {format(new Date(evento.data_evento), "dd/MM", { locale: ptBR })}
                          </span>
                          <span className="font-medium">{evento.nome}</span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>{evento.vidas_alcancadas} vidas</span>
                          <span>{evento.decisoes} decisões</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EventoFormDialog
        open={isEventoFormOpen}
        onOpenChange={setIsEventoFormOpen}
        frenteId={frente.id}
        evento={selectedEvento}
      />

      <AlertDialog open={!!eventoToDelete} onOpenChange={() => setEventoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventoToDelete && deleteMutation.mutate(eventoToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
