import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Calendar, Bell, AlertTriangle, Info, GripVertical, Image as ImageIcon, Send, Loader2 } from "lucide-react";
import { dispararEnvioFlyerHomepage } from "@/lib/whatsapp-notifications";

interface Aviso {
  id: string;
  titulo: string;
  descricao: string;
  data?: string;
  horario?: string;
  tipo: "event" | "urgent" | "info";
  ativo: boolean;
  ordem: number;
}

interface EventoComFlyer {
  id: string;
  titulo: string;
  data_evento: string;
  hora_inicio?: string;
  tipo_evento: string;
  descricao?: string;
  flyer_url: string;
}

const tipoIcons = {
  event: Calendar,
  urgent: AlertTriangle,
  info: Info,
};

const tipoLabels = {
  event: "Evento",
  urgent: "Urgente",
  info: "Informativo",
};

const tipoColors = {
  event: "bg-secondary text-secondary-foreground",
  urgent: "bg-destructive text-destructive-foreground",
  info: "bg-primary text-primary-foreground",
};

const HomepageAvisosTab = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAviso, setEditingAviso] = useState<Aviso | null>(null);
  const [enviandoFlyerId, setEnviandoFlyerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data: "",
    horario: "",
    tipo: "info" as "event" | "urgent" | "info",
  });

  // Buscar avisos avulsos
  const { data: avisos, isLoading: loadingAvisos } = useQuery({
    queryKey: ["homepage-avisos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_avisos")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as Aviso[];
    },
  });

  // Buscar eventos da agenda que podem virar avisos (sem flyer)
  const { data: eventosAgenda } = useQuery({
    queryKey: ["eventos-agenda-avisos"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, hora_inicio, tipo_evento, descricao")
        .eq("ativo", true)
        .is("flyer_url", null)
        .gte("data_evento", today)
        .order("data_evento", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Buscar eventos com flyer (exibidos na homepage)
  const { data: eventosComFlyer } = useQuery({
    queryKey: ["eventos-com-flyer-admin"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, hora_inicio, tipo_evento, descricao, flyer_url")
        .eq("ativo", true)
        .not("flyer_url", "is", null)
        .gte("data_evento", today)
        .order("data_evento", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data || []) as EventoComFlyer[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Aviso, "id" | "ativo" | "ordem">) => {
      const maxOrdem = avisos?.reduce((max, a) => Math.max(max, a.ordem), 0) || 0;
      const { error } = await supabase
        .from("homepage_avisos")
        .insert({ ...data, ordem: maxOrdem + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["homepage-avisos"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-avisos-public"] });
      setFormOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao criar aviso");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Aviso> & { id: string }) => {
      const { error } = await supabase
        .from("homepage_avisos")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso atualizado!");
      queryClient.invalidateQueries({ queryKey: ["homepage-avisos"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-avisos-public"] });
      setFormOpen(false);
      setEditingAviso(null);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao atualizar aviso");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_avisos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso removido!");
      queryClient.invalidateQueries({ queryKey: ["homepage-avisos"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-avisos-public"] });
    },
    onError: () => {
      toast.error("Erro ao remover aviso");
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      data: "",
      horario: "",
      tipo: "info",
    });
  };

  const handleEdit = (aviso: Aviso) => {
    setEditingAviso(aviso);
    setFormData({
      titulo: aviso.titulo,
      descricao: aviso.descricao,
      data: aviso.data || "",
      horario: aviso.horario || "",
      tipo: aviso.tipo,
    });
    setFormOpen(true);
  };

  const handleAddFromEvento = (evento: { titulo: string; data_evento: string; hora_inicio?: string; descricao?: string }) => {
    setFormData({
      titulo: evento.titulo,
      descricao: evento.descricao || "",
      data: format(new Date(evento.data_evento), "dd/MM/yyyy"),
      horario: evento.hora_inicio || "",
      tipo: "event",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (editingAviso) {
      updateMutation.mutate({ id: editingAviso.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleAtivo = (aviso: Aviso) => {
    updateMutation.mutate({ id: aviso.id, ativo: !aviso.ativo });
  };

  if (loadingAvisos) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Avisos da Homepage</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os avisos exibidos na página inicial
          </p>
        </div>
        <Dialog open={formOpen} onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingAviso(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Aviso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAviso ? "Editar Aviso" : "Novo Aviso"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo do Aviso</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: "event" | "urgent" | "info") =>
                    setFormData(prev => ({ ...prev, tipo: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">📅 Evento</SelectItem>
                    <SelectItem value="urgent">⚠️ Urgente</SelectItem>
                    <SelectItem value="info">ℹ️ Informativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Título do aviso"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do aviso"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    value={formData.data}
                    onChange={(e) => {
                      const numbers = e.target.value.replace(/\D/g, "");
                      let formatted = numbers;
                      if (numbers.length <= 2) formatted = numbers;
                      else if (numbers.length <= 4) formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
                      else formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
                      setFormData(prev => ({ ...prev, data: formatted }));
                    }}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    value={formData.horario}
                    onChange={(e) => {
                      const numbers = e.target.value.replace(/\D/g, "");
                      let formatted = numbers;
                      if (numbers.length <= 2) formatted = numbers;
                      else formatted = `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
                      setFormData(prev => ({ ...prev, horario: formatted }));
                    }}
                    placeholder="HH:MM"
                    maxLength={5}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingAviso ? "Salvar Alterações" : "Criar Aviso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Flyers exibidos na Homepage */}
      {eventosComFlyer && eventosComFlyer.length > 0 && (
        <Card className="border-secondary/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-secondary" />
              Flyers Exibidos na Homepage
            </CardTitle>
            <CardDescription>
              Eventos com flyer que aparecem automaticamente na homepage. Limite de 3 eventos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {eventosComFlyer.slice(0, 3).map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-lg overflow-hidden border border-border bg-muted/30"
                >
                  <img
                    src={evento.flyer_url}
                    alt={evento.titulo}
                    className="w-full h-auto object-contain"
                  />
                  <div className="p-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{evento.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(evento.data_evento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={async () => {
                        try {
                          const { error, count } = await supabase
                            .from("agenda_igreja")
                            .update({ flyer_url: null as string | null })
                            .eq("id", evento.id)
                            .select();
                          if (error) {
                            console.error("Erro ao remover flyer:", error);
                            toast.error("Erro ao remover flyer: " + error.message);
                          } else {
                            toast.success("Flyer removido da homepage");
                            queryClient.invalidateQueries({ queryKey: ["eventos-com-flyer-admin"] });
                            queryClient.invalidateQueries({ queryKey: ["eventos-com-flyer-public"] });
                          }
                        } catch (err: any) {
                          console.error("Erro inesperado:", err);
                          toast.error("Erro inesperado ao remover flyer");
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {eventosComFlyer.length > 3 && (
              <p className="text-xs text-muted-foreground mt-3">
                + {eventosComFlyer.length - 3} flyer(s) não exibido(s) (limite de 3 na homepage)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Eventos da Agenda que podem virar avisos */}
      {eventosAgenda && eventosAgenda.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar da Agenda</CardTitle>
            <CardDescription>
              Clique em um evento para adicioná-lo como aviso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {eventosAgenda.slice(0, 6).map((evento) => (
                <Button
                  key={evento.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddFromEvento(evento)}
                  className="text-xs"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {evento.titulo}
                  <span className="text-muted-foreground ml-1">
                    ({format(new Date(evento.data_evento), "dd/MM")})
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Avisos */}
      <div className="space-y-3">
        <h3 className="font-heading font-semibold">Avisos Manuais</h3>
        {!avisos || avisos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhum aviso cadastrado ainda
            </CardContent>
          </Card>
        ) : (
          avisos.map((aviso) => {
            const AvisoIcon = tipoIcons[aviso.tipo];
            return (
              <Card key={aviso.id} className={!aviso.ativo ? "opacity-50" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <div className={`p-2 rounded-lg ${tipoColors[aviso.tipo]}`}>
                        <AvisoIcon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{aviso.titulo}</h4>
                        <Badge variant="outline" className="text-xs">
                          {tipoLabels[aviso.tipo]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {aviso.descricao}
                      </p>
                      {(aviso.data || aviso.horario) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {aviso.data} {aviso.horario && `• ${aviso.horario}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={aviso.ativo}
                        onCheckedChange={() => handleToggleAtivo(aviso)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(aviso)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteMutation.mutate(aviso.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HomepageAvisosTab;
