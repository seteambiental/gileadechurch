import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, Video, Music2, FileText, Guitar, ExternalLink } from "lucide-react";

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

interface LouvorMusicaDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  musica: Musica | null;
  onEdit: (musica: Musica) => void;
}

const CATEGORIAS: Record<string, string> = {
  adoracao: "Adoração",
  louvor: "Louvor",
  congregacional: "Congregacional",
  especial: "Especial",
  infantil: "Infantil",
};

export const LouvorMusicaDetalhesDialog = ({
  open,
  onOpenChange,
  musica,
  onEdit,
}: LouvorMusicaDetalhesDialogProps) => {
  if (!musica) return null;

  const getYoutubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const embedUrl = musica.video_url ? getYoutubeEmbedUrl(musica.video_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-row items-start justify-between gap-4">
          <div className="flex-1">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Music2 className="w-5 h-5 text-destructive" />
              {musica.titulo}
            </DialogTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {musica.artista && (
                <span className="text-muted-foreground">{musica.artista}</span>
              )}
              {musica.tom && (
                <Badge variant="outline">Tom: {musica.tom}</Badge>
              )}
              {musica.bpm && (
                <Badge variant="secondary">{musica.bpm} BPM</Badge>
              )}
              {musica.categoria && (
                <Badge>{CATEGORIAS[musica.categoria] || musica.categoria}</Badge>
              )}
            </div>
            {musica.tags && musica.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {musica.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(musica)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </DialogHeader>

        <Tabs defaultValue={musica.letra ? "letra" : musica.cifra ? "cifra" : "video"} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="letra" className="gap-2" disabled={!musica.letra}>
              <FileText className="w-4 h-4" />
              Letra
            </TabsTrigger>
            <TabsTrigger value="cifra" className="gap-2" disabled={!musica.cifra}>
              <Guitar className="w-4 h-4" />
              Cifra
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-2" disabled={!musica.video_url}>
              <Video className="w-4 h-4" />
              Vídeo
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="letra" className="h-full m-0">
              <ScrollArea className="h-[50vh]">
                {musica.letra ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 bg-muted/30 rounded-lg">
                    {musica.letra}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma letra cadastrada
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="cifra" className="h-full m-0">
              <ScrollArea className="h-[50vh]">
                {musica.cifra ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 bg-muted/30 rounded-lg">
                    {musica.cifra}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma cifra cadastrada
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="video" className="h-full m-0">
              {embedUrl ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : musica.video_url ? (
                <div className="text-center py-12">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Não foi possível incorporar o vídeo
                  </p>
                  <Button asChild variant="outline">
                    <a 
                      href={musica.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir vídeo externo
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum vídeo cadastrado
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {musica.observacoes && (
          <div className="pt-4 border-t mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>Observações:</strong> {musica.observacoes}
            </p>
          </div>
        )}

        {musica.audio_url && (
          <div className="pt-4 border-t">
            <Button asChild variant="outline" size="sm">
              <a 
                href={musica.audio_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvir áudio
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
