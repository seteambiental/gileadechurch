import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Search, 
  Music, 
  Video, 
  Edit2, 
  Trash2,
  FileText,
  Guitar,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { includesNormalized } from "@/lib/text-utils";
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
import { useToast } from "@/hooks/use-toast";
import { LouvorMusicaFormDialog } from "./LouvorMusicaFormDialog";
import { LouvorMusicaDetalhesDialog } from "./LouvorMusicaDetalhesDialog";

interface LouvorMusicasTabProps {
  ministryId: string;
}

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
  created_at?: string;
}

const CATEGORIAS = [
  { value: "todas", label: "Todas as categorias" },
  { value: "adoracao", label: "Adoração" },
  { value: "louvor", label: "Louvor" },
  { value: "congregacional", label: "Congregacional" },
  { value: "especial", label: "Especial" },
  { value: "infantil", label: "Infantil" },
];

export const LouvorMusicasTab = ({ ministryId }: LouvorMusicasTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);
  const [editingMusica, setEditingMusica] = useState<Musica | null>(null);
  const [viewingMusica, setViewingMusica] = useState<Musica | null>(null);
  const [deleteMusica, setDeleteMusica] = useState<Musica | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch músicas
  const { data: musicas = [], isLoading } = useQuery({
    queryKey: ["louvor-musicas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("louvor_musicas")
        .select("*")
        .order("titulo");
      if (error) throw error;
      return data as Musica[];
    },
  });

  const filteredMusicas = useMemo(() => {
    return musicas.filter(m => {
      const matchesSearch = !searchQuery || 
        includesNormalized(m.titulo, searchQuery) ||
        includesNormalized(m.artista || "", searchQuery) ||
        m.tags?.some(t => includesNormalized(t, searchQuery));
      
      const matchesCategoria = categoriaFilter === "todas" || m.categoria === categoriaFilter;
      
      return matchesSearch && matchesCategoria;
    });
  }, [musicas, searchQuery, categoriaFilter]);

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("louvor_musicas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["louvor-musicas"] });
      toast({ title: "Música excluída com sucesso!" });
      setDeleteMusica(null);
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir música", 
        description: String(error), 
        variant: "destructive" 
      });
    },
  });

  const handleEdit = (musica: Musica) => {
    setEditingMusica(musica);
    setShowFormDialog(true);
  };

  const handleView = (musica: Musica) => {
    setViewingMusica(musica);
    setShowDetalhesDialog(true);
  };

  const handleCloseForm = () => {
    setShowFormDialog(false);
    setEditingMusica(null);
  };

  const getCategoriaLabel = (categoria: string | null) => {
    return CATEGORIAS.find(c => c.value === categoria)?.label || categoria || "Sem categoria";
  };

  return (
    <div className="space-y-4">
      {/* Header com busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, artista ou tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
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
        <Button onClick={() => setShowFormDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Música
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{musicas.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {musicas.filter(m => m.letra).length}
            </p>
            <p className="text-xs text-muted-foreground">Com Letra</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {musicas.filter(m => m.cifra).length}
            </p>
            <p className="text-xs text-muted-foreground">Com Cifra</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {musicas.filter(m => m.video_url).length}
            </p>
            <p className="text-xs text-muted-foreground">Com Vídeo</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de músicas */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando músicas...
        </div>
      ) : filteredMusicas.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Music className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchQuery || categoriaFilter !== "todas" 
                ? "Nenhuma música encontrada com os filtros aplicados"
                : "Nenhuma música cadastrada ainda"}
            </p>
            {!searchQuery && categoriaFilter === "todas" && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowFormDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar primeira música
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-2">
            {filteredMusicas.map((musica) => (
              <Card 
                key={musica.id} 
                className="bg-card border-border hover:border-destructive/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground truncate">
                          {musica.titulo}
                        </h3>
                        {musica.tom && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Tom: {musica.tom}
                          </Badge>
                        )}
                        {musica.bpm && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {musica.bpm} BPM
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {musica.artista && (
                          <span>{musica.artista}</span>
                        )}
                        <span>•</span>
                        <span>{getCategoriaLabel(musica.categoria)}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {musica.letra && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <FileText className="w-3 h-3" />
                            Letra
                          </Badge>
                        )}
                        {musica.cifra && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Guitar className="w-3 h-3" />
                            Cifra
                          </Badge>
                        )}
                        {musica.video_url && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Video className="w-3 h-3" />
                            Vídeo
                          </Badge>
                        )}
                        {musica.tags && musica.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {musica.tags.slice(0, 3).map((tag, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {musica.tags.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{musica.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(musica)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(musica)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteMusica(musica)}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialog de formulário */}
      <LouvorMusicaFormDialog
        open={showFormDialog}
        onOpenChange={handleCloseForm}
        editingMusica={editingMusica}
      />

      {/* Dialog de detalhes */}
      <LouvorMusicaDetalhesDialog
        open={showDetalhesDialog}
        onOpenChange={setShowDetalhesDialog}
        musica={viewingMusica}
        onEdit={(musica) => {
          setShowDetalhesDialog(false);
          handleEdit(musica);
        }}
      />

      {/* Alert de exclusão */}
      <AlertDialog open={!!deleteMusica} onOpenChange={() => setDeleteMusica(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir música?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteMusica?.titulo}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMusica && deleteMutation.mutate(deleteMusica.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
