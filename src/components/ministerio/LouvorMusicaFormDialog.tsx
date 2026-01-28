import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Musica {
  id: string;
  titulo: string;
  artista: string | null;
  tom: string | null;
  bpm: number | null;
  letra: string | null;
  cifra: string | null;
  video_url: string | null;
  audio_url: string | null;
  categoria: string | null;
  tags: string[] | null;
  observacoes: string | null;
}

interface LouvorMusicaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMusica: Musica | null;
}

const TONS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dbm", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gbm", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm"
];

const CATEGORIAS = [
  { value: "adoracao", label: "Adoração" },
  { value: "louvor", label: "Louvor" },
  { value: "congregacional", label: "Congregacional" },
  { value: "especial", label: "Especial" },
  { value: "infantil", label: "Infantil" },
];

interface FormData {
  titulo: string;
  artista: string;
  tom: string;
  bpm: string;
  letra: string;
  cifra: string;
  video_url: string;
  audio_url: string;
  categoria: string;
  tags: string[];
  observacoes: string;
}

const initialForm: FormData = {
  titulo: "",
  artista: "",
  tom: "",
  bpm: "",
  letra: "",
  cifra: "",
  video_url: "",
  audio_url: "",
  categoria: "adoracao",
  tags: [],
  observacoes: "",
};

export const LouvorMusicaFormDialog = ({
  open,
  onOpenChange,
  editingMusica,
}: LouvorMusicaFormDialogProps) => {
  const [form, setForm] = useState<FormData>(initialForm);
  const [newTag, setNewTag] = useState("");
  const [activeTab, setActiveTab] = useState("info");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingMusica) {
      setForm({
        titulo: editingMusica.titulo,
        artista: editingMusica.artista || "",
        tom: editingMusica.tom || "",
        bpm: editingMusica.bpm?.toString() || "",
        letra: editingMusica.letra || "",
        cifra: editingMusica.cifra || "",
        video_url: editingMusica.video_url || "",
        audio_url: editingMusica.audio_url || "",
        categoria: editingMusica.categoria || "adoracao",
        tags: editingMusica.tags || [],
        observacoes: editingMusica.observacoes || "",
      });
    } else {
      setForm(initialForm);
    }
    setActiveTab("info");
  }, [editingMusica, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const musicaData = {
        titulo: form.titulo.trim(),
        artista: form.artista.trim() || null,
        tom: form.tom || null,
        bpm: form.bpm ? parseInt(form.bpm) : null,
        letra: form.letra.trim() || null,
        cifra: form.cifra.trim() || null,
        video_url: form.video_url.trim() || null,
        audio_url: form.audio_url.trim() || null,
        categoria: form.categoria,
        tags: form.tags.length > 0 ? form.tags : null,
        observacoes: form.observacoes.trim() || null,
      };

      if (editingMusica) {
        const { error } = await supabase
          .from("louvor_musicas")
          .update(musicaData)
          .eq("id", editingMusica.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("louvor_musicas")
          .insert(musicaData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["louvor-musicas"] });
      toast({ 
        title: editingMusica ? "Música atualizada!" : "Música cadastrada!" 
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar música", 
        description: String(error), 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      toast({ 
        title: "Preencha o título da música", 
        variant: "destructive" 
      });
      return;
    }
    saveMutation.mutate();
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm({ ...form, tags: [...form.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tagToRemove) });
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMusica ? "Editar Música" : "Nova Música"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="letra">Letra</TabsTrigger>
              <TabsTrigger value="cifra">Cifra</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Nome da música"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artista">Artista</Label>
                  <Input
                    id="artista"
                    value={form.artista}
                    onChange={(e) => setForm({ ...form, artista: e.target.value })}
                    placeholder="Nome do artista ou banda"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tom">Tom</Label>
                  <Select value={form.tom} onValueChange={(v) => setForm({ ...form, tom: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONS.map(tom => (
                        <SelectItem key={tom} value={tom}>{tom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bpm">BPM</Label>
                  <Input
                    id="bpm"
                    type="number"
                    value={form.bpm}
                    onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                    placeholder="120"
                    min="1"
                    max="300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">Link do Vídeo (YouTube)</Label>
                <Input
                  id="video_url"
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio_url">Link do Áudio</Label>
                <Input
                  id="audio_url"
                  value={form.audio_url}
                  onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Adicionar tag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Observações gerais sobre a música..."
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="letra" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="letra">Letra da Música</Label>
                <Textarea
                  id="letra"
                  value={form.letra}
                  onChange={(e) => setForm({ ...form, letra: e.target.value })}
                  placeholder="Cole ou digite a letra da música aqui..."
                  rows={18}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="cifra" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="cifra">Cifra da Música</Label>
                <Textarea
                  id="cifra"
                  value={form.cifra}
                  onChange={(e) => setForm({ ...form, cifra: e.target.value })}
                  placeholder="Cole ou digite a cifra da música aqui (com acordes)..."
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingMusica ? "Salvar Alterações" : "Cadastrar Música"}
            </Button>
          </div>
        </form>

      </DialogContent>
    </Dialog>
  );
};
