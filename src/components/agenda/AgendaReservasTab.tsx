import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Edit, Trash2, Loader2, DoorOpen, CalendarIcon, Clock, Check, X, Users, Monitor,
  AlertCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AmbienteFormDialog } from "./AmbienteFormDialog";
import { ReservaFormDialog } from "./ReservaFormDialog";

export const AgendaReservasTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState("reservas");
  const [showAmbienteForm, setShowAmbienteForm] = useState(false);
  const [editingAmbiente, setEditingAmbiente] = useState<any>(null);
  const [showReservaForm, setShowReservaForm] = useState(false);
  const [editingReserva, setEditingReserva] = useState<any>(null);
  const [deletingAmbiente, setDeletingAmbiente] = useState<any>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

  // Fetch ambientes
  const { data: ambientes = [], isLoading: loadingAmbientes } = useQuery({
    queryKey: ["ambientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ambientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch reservas com joins
  const { data: reservas = [], isLoading: loadingReservas } = useQuery({
    queryKey: ["reservas-ambientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas_ambientes")
        .select("*, ambiente:ambientes(nome), solicitante:members!solicitante_id(full_name)")
        .order("data_reserva", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Delete ambiente
  const deleteAmbienteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ambientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ambiente excluído!" });
      queryClient.invalidateQueries({ queryKey: ["ambientes"] });
      setDeletingAmbiente(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  // Aprovar reserva
  const aprovarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservas_ambientes").update({ status: "aprovado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reserva aprovada!" });
      queryClient.invalidateQueries({ queryKey: ["reservas-ambientes"] });
    },
  });

  // Rejeitar reserva
  const rejeitarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await supabase.from("reservas_ambientes").update({ status: "rejeitado", motivo_rejeicao: motivo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reserva rejeitada" });
      setRejectingId(null);
      setMotivoRejeicao("");
      queryClient.invalidateQueries({ queryKey: ["reservas-ambientes"] });
    },
  });

  // Cancelar reserva
  const cancelarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservas_ambientes").update({ status: "cancelado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reserva cancelada" });
      queryClient.invalidateQueries({ queryKey: ["reservas-ambientes"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-300">Pendente</Badge>;
      case "aprovado": return <Badge variant="default" className="bg-green-600">Aprovado</Badge>;
      case "rejeitado": return <Badge variant="destructive">Rejeitado</Badge>;
      case "cancelado": return <Badge variant="secondary">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const recorrenciaLabel: Record<string, string> = {
    semanal: "Semanal",
    quinzenal: "Quinzenal",
    mensal: "Mensal",
  };

  const reservasPendentes = reservas.filter((r: any) => r.status === "pendente");
  const reservasAtivas = reservas.filter((r: any) => r.status !== "cancelado");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl">Reserva de Ambientes</h2>
          <p className="text-sm text-muted-foreground">Gerencie salas de reunião e espaços</p>
        </div>
        <Button onClick={() => { setEditingReserva(null); setShowReservaForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Reserva
        </Button>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="reservas" className="gap-1.5">
            <CalendarIcon className="w-4 h-4" />
            Reservas
            {reservasPendentes.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                {reservasPendentes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ambientes" className="gap-1.5">
            <DoorOpen className="w-4 h-4" />
            Ambientes
          </TabsTrigger>
        </TabsList>

        {/* Sub-aba Reservas */}
        <TabsContent value="reservas" className="space-y-4 mt-4">
          {loadingReservas ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : reservasAtivas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">Nenhuma reserva</h3>
                <p className="text-sm text-muted-foreground">Solicite a reserva de um ambiente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reservasAtivas.map((reserva: any) => (
                <Card key={reserva.id} className={reserva.status === "pendente" ? "border-yellow-300" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold">{reserva.titulo}</h4>
                          {getStatusBadge(reserva.status)}
                          {reserva.recorrente && (
                            <Badge variant="outline" className="text-xs">
                              {recorrenciaLabel[reserva.tipo_recorrencia] || "Recorrente"}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <DoorOpen className="w-3.5 h-3.5" />
                            {reserva.ambiente?.nome || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {format(parseISO(reserva.data_reserva), "dd/MM/yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {reserva.hora_inicio?.substring(0, 5)} - {reserva.hora_fim?.substring(0, 5)}
                          </span>
                        </div>
                        {reserva.solicitante?.full_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Solicitado por: <span className="font-medium">{reserva.solicitante.full_name}</span>
                          </p>
                        )}
                        {reserva.status === "rejeitado" && reserva.motivo_rejeicao && (
                          <p className="text-sm text-destructive mt-1">Motivo: {reserva.motivo_rejeicao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {reserva.status === "pendente" && (
                          <>
                            <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 gap-1"
                              onClick={() => aprovarMutation.mutate(reserva.id)} disabled={aprovarMutation.isPending}>
                              <Check className="w-4 h-4" /> Aprovar
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1"
                              onClick={() => setRejectingId(reserva.id)}>
                              <X className="w-4 h-4" /> Rejeitar
                            </Button>
                          </>
                        )}
                        {reserva.status === "aprovado" && (
                          <Button size="sm" variant="outline" onClick={() => cancelarMutation.mutate(reserva.id)}>
                            Cancelar
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditingReserva(reserva); setShowReservaForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sub-aba Ambientes */}
        <TabsContent value="ambientes" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setEditingAmbiente(null); setShowAmbienteForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Ambiente
            </Button>
          </div>
          {loadingAmbientes ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : ambientes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DoorOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">Nenhum ambiente cadastrado</h3>
                <p className="text-sm text-muted-foreground mb-4">Cadastre salas de reunião e espaços disponíveis.</p>
                <Button onClick={() => { setEditingAmbiente(null); setShowAmbienteForm(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Cadastrar Ambiente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ambientes.map((amb: any) => (
                <Card key={amb.id} className={!amb.ativo ? "opacity-60" : ""}>
                  {amb.foto_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img src={amb.foto_url} alt={amb.nome} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{amb.nome}</h3>
                      {!amb.ativo && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    {amb.descricao && <p className="text-sm text-muted-foreground mb-2">{amb.descricao}</p>}
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mb-3">
                      {amb.capacidade && (
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{amb.capacidade} pessoas</span>
                      )}
                    </div>
                    {amb.recursos?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {amb.recursos.map((r: string) => (
                          <Badge key={r} variant="outline" className="text-xs"><Monitor className="w-3 h-3 mr-1" />{r}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setEditingAmbiente(amb); setShowAmbienteForm(true); }}>
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingAmbiente(amb)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AmbienteFormDialog open={showAmbienteForm} onOpenChange={setShowAmbienteForm} ambiente={editingAmbiente} />
      <ReservaFormDialog open={showReservaForm} onOpenChange={setShowReservaForm} reserva={editingReserva} />

      {/* Delete ambiente dialog */}
      <AlertDialog open={!!deletingAmbiente} onOpenChange={(open) => !open && setDeletingAmbiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ambiente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingAmbiente?.nome}"? Todas as reservas associadas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingAmbiente && deleteAmbienteMutation.mutate(deletingAmbiente.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Reserva</AlertDialogTitle>
            <AlertDialogDescription>Informe o motivo da rejeição.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Motivo..." value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => rejectingId && rejeitarMutation.mutate({ id: rejectingId, motivo: motivoRejeicao })}>
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
