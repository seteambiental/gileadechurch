import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Music, 
  Video, 
  Trash2, 
  Edit2,
  GripVertical,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface MinisterioRepertorioTabProps {
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

const TONS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dbm", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gbm", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm"
];

const TIPOS_CULTO: Record<string, string> = {
  domingo: "Domingo",
  quarta: "Quarta-feira",
  especial: "Especial",
  evento: "Evento",
};

export const MinisterioRepertorioTab = ({ ministryId }: MinisterioRepertorioTabProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [editingMusica, setEditingMusica] = useState<Musica | null>(null);
  const [deleteMusica, setDeleteMusica] = useState<Musica | null>(null);
  
  const [musicaForm, setMusicaForm] = useState({
    titulo: "",
    artista: "",
    tom: "",
    video_url: "",
    observacoes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch escalas do mês
  const { data: escalas = [] } = useQuery({
    queryKey: ["ministerio-escalas-repertorio", ministryId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_escalas")
        .select("id, data_culto, tipo_culto")
        .eq("ministry_id", ministryId)
        .gte("data_culto", format(monthStart, "yyyy-MM-dd"))
        .lte("data_culto", format(monthEnd, "yyyy-MM-dd"))
        .order("data_culto");
      if (error) throw error;
      return data as Escala[];
    },
  });

  // Fetch repertório
  const { data: repertorio = [] } = useQuery({
    queryKey: ["ministerio-repertorio", ministryId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const escalaIds = escalas.map(e => e.id);
      if (escalaIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("ministerio_repertorio")
        .select("*")
        .in("escala_id", escalaIds)
        .order("ordem");
      if (error) throw error;
      return data as Musica[];
    },
    enabled: escalas.length > 0,
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

  // Mutation para salvar música
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEscala) throw new Error("Selecione uma escala");
      
      const musicaData = {
        escala_id: selectedEscala.id,
        ministry_id: ministryId,
        titulo: musicaForm.titulo,
        artista: musicaForm.artista || null,
        tom: musicaForm.tom || null,
        video_url: musicaForm.video_url || null,
        observacoes: musicaForm.observacoes || null,
        ordem: editingMusica ? editingMusica.ordem : (musicasByEscala[selectedEscala.id]?.length || 0) + 1,
      };

      if (editingMusica) {
        const { error } = await supabase
          .from("ministerio_repertorio")
          .update(musicaData)
          .eq("id", editingMusica.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ministerio_repertorio")
          .insert(musicaData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-repertorio"] });
      toast({ title: editingMusica ? "Música atualizada!" : "Música adicionada!" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar música", description: String(error), variant: "destructive" });
    },
  });

  // Mutation para deletar música
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ministerio_repertorio")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-repertorio"] });
      toast({ title: "Música removida!" });
      setDeleteMusica(null);
    },
    onError: (error) => {
      toast({ title: "Erro ao remover música", description: String(error), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowMusicDialog(false);
    setSelectedEscala(null);
    setEditingMusica(null);
    setMusicaForm({
      titulo: "",
      artista: "",
      tom: "",
      video_url: "",
      observacoes: "",
    });
  };

  const handleAddMusica = (escala: Escala) => {
    setSelectedEscala(escala);
    setEditingMusica(null);
    setMusicaForm({
      titulo: "",
      artista: "",
      tom: "",
      video_url: "",
      observacoes: "",
    });
    setShowMusicDialog(true);
  };

  const handleEditMusica = (musica: Musica, escala: Escala) => {
    setSelectedEscala(escala);
    setEditingMusica(musica);
    setMusicaForm({
      titulo: musica.titulo,
      artista: musica.artista || "",
      tom: musica.tom || "",
      video_url: musica.video_url || "",
      observacoes: musica.observacoes || "",
    });
    setShowMusicDialog(true);
  };

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-6">
      {/* Header com navegação de mês */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Repertório</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Lista de escalas com repertório */}
      {escalas.length === 0 ? (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma escala cadastrada para este mês.</p>
            <p className="text-sm mt-1">Crie escalas na aba "Escalas" para adicionar repertório.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {escalas.map((escala) => {
            const musicas = musicasByEscala[escala.id] || [];
            const dataFormatada = format(new Date(escala.data_culto + "T00:00:00"), "dd/MM - EEEE", { locale: ptBR });
            
            return (
              <Card key={escala.id} className="bg-card border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-medium capitalize">
                        {dataFormatada}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {TIPOS_CULTO[escala.tipo_culto] || escala.tipo_culto}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMusica(escala)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Música
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {musicas.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma música adicionada ainda.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {musicas.map((musica, index) => (
                        <div
                          key={musica.id}
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
                        >
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate">
                                {musica.titulo}
                              </p>
                              {musica.tom && (
                                <Badge variant="secondary" className="text-xs">
                                  Tom: {musica.tom}
                                </Badge>
                              )}
                            </div>
                            {musica.artista && (
                              <p className="text-sm text-muted-foreground truncate">
                                {musica.artista}
                              </p>
                            )}
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
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditMusica(musica, escala)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteMusica(musica)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para adicionar/editar música */}
      <Dialog open={showMusicDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMusica ? "Editar Música" : "Adicionar Música"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={musicaForm.titulo}
                onChange={(e) => setMusicaForm({ ...musicaForm, titulo: e.target.value })}
                placeholder="Nome da música"
              />
            </div>

            <div>
              <Label>Artista/Banda</Label>
              <Input
                value={musicaForm.artista}
                onChange={(e) => setMusicaForm({ ...musicaForm, artista: e.target.value })}
                placeholder="Ex: Hillsong, Elevation Worship"
              />
            </div>

            <div>
              <Label>Tom</Label>
              <Select
                value={musicaForm.tom}
                onValueChange={(v) => setMusicaForm({ ...musicaForm, tom: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tom" />
                </SelectTrigger>
                <SelectContent>
                  {TONS.map((tom) => (
                    <SelectItem key={tom} value={tom}>
                      {tom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Link do Vídeo (YouTube)</Label>
              <Input
                value={musicaForm.video_url}
                onChange={(e) => setMusicaForm({ ...musicaForm, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
              {musicaForm.video_url && extractVideoId(musicaForm.video_url) && (
                <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractVideoId(musicaForm.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Preview do vídeo"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={musicaForm.observacoes}
                onChange={(e) => setMusicaForm({ ...musicaForm, observacoes: e.target.value })}
                placeholder="Notas sobre a música, arranjo, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!musicaForm.titulo || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert para deletar música */}
      <AlertDialog open={!!deleteMusica} onOpenChange={() => setDeleteMusica(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover música?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteMusica?.titulo}" do repertório?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMusica && deleteMutation.mutate(deleteMusica.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
