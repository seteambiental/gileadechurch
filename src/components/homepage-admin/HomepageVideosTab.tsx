import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Video, Plus, Pencil, Trash2, GripVertical, ExternalLink } from "lucide-react";

interface HomepageVideo {
  id: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  thumbnail_url: string | null;
  ordem: number;
  ativo: boolean;
}

const HomepageVideosTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HomepageVideo | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    video_url: "",
    thumbnail_url: "",
    ativo: true,
  });

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["homepage-videos-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_videos")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as HomepageVideo[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrdem = videos.length > 0 ? Math.max(...videos.map(v => v.ordem)) + 1 : 1;
      const { error } = await supabase
        .from("homepage_videos")
        .insert({ ...data, ordem: maxOrdem });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vídeo adicionado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["homepage-videos-admin"] });
      handleCloseDialog();
    },
    onError: () => toast.error("Erro ao adicionar vídeo"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<HomepageVideo> }) => {
      const { error } = await supabase
        .from("homepage_videos")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vídeo atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["homepage-videos-admin"] });
      handleCloseDialog();
    },
    onError: () => toast.error("Erro ao atualizar vídeo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("homepage_videos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vídeo removido!");
      queryClient.invalidateQueries({ queryKey: ["homepage-videos-admin"] });
    },
    onError: () => toast.error("Erro ao remover vídeo"),
  });

  const handleOpenCreate = () => {
    setEditingVideo(null);
    setFormData({ titulo: "", descricao: "", video_url: "", thumbnail_url: "", ativo: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (video: HomepageVideo) => {
    setEditingVideo(video);
    setFormData({
      titulo: video.titulo,
      descricao: video.descricao || "",
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || "",
      ativo: video.ativo,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingVideo(null);
    setFormData({ titulo: "", descricao: "", video_url: "", thumbnail_url: "", ativo: true });
  };

  const handleSubmit = () => {
    if (!formData.titulo || !formData.video_url) {
      toast.error("Preencha título e URL do vídeo");
      return;
    }
    if (editingVideo) {
      updateMutation.mutate({ id: editingVideo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleAtivo = (video: HomepageVideo) => {
    updateMutation.mutate({ id: video.id, data: { ativo: !video.ativo } });
  };

  // Extract video ID from YouTube URL
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const getThumbnail = (video: HomepageVideo) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    const ytId = getYouTubeId(video.video_url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Vídeos da Homepage
            </CardTitle>
            <CardDescription>
              Gerencie os vídeos exibidos na página inicial (YouTube ou links externos)
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Vídeo
          </Button>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum vídeo cadastrado ainda.</p>
              <p className="text-sm">Clique em "Adicionar Vídeo" para começar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => {
                const thumbnail = getThumbnail(video);
                return (
                  <div
                    key={video.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
                      !video.ativo ? "opacity-50 bg-muted/30" : ""
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                    
                    {thumbnail && (
                      <img
                        src={thumbnail}
                        alt={video.titulo}
                        className="w-24 h-16 object-cover rounded"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{video.titulo}</h4>
                      {video.descricao && (
                        <p className="text-sm text-muted-foreground truncate">{video.descricao}</p>
                      )}
                      <a
                        href={video.video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-secondary hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver vídeo
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={video.ativo}
                        onCheckedChange={() => toggleAtivo(video)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(video)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Remover este vídeo?")) {
                            deleteMutation.mutate(video.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVideo ? "Editar Vídeo" : "Adicionar Vídeo"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título do vídeo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url">URL do Vídeo *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=... ou link do vídeo"
              />
              <p className="text-xs text-muted-foreground">
                Cole a URL do YouTube, Vimeo ou qualquer link de vídeo
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Breve descrição do vídeo"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">URL da Thumbnail (opcional)</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="Deixe vazio para usar thumbnail do YouTube"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Vídeo ativo (visível na homepage)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingVideo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomepageVideosTab;
