import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, Music, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  url: string;
}

interface LyricsResult {
  found: boolean;
  title?: string;
  artist?: string;
  lyrics?: string;
  translation?: string | null;
  error?: string;
}

interface VagalumeBuscaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (data: { titulo: string; artista: string; letra: string }) => void;
}

export const VagalumeBuscaDialog = ({
  open,
  onOpenChange,
  onSelect,
}: VagalumeBuscaDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);

  const { toast } = useToast();

  // Mutation para buscar músicas
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.functions.invoke("buscar-letra-vagalume", {
        body: { action: "search", query },
      });
      if (error) throw error;
      return data as { results: SearchResult[]; message?: string };
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      setSelectedResult(null);
      setLyrics(null);
      if (data.results.length === 0) {
        toast({ title: "Nenhuma música encontrada", variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "Erro na busca", description: String(error), variant: "destructive" });
    },
  });

  // Mutation para buscar letra específica
  const lyricsMutation = useMutation({
    mutationFn: async (result: SearchResult) => {
      const { data, error } = await supabase.functions.invoke("buscar-letra-vagalume", {
        body: { action: "get_lyrics", artist: result.artist, music: result.title },
      });
      if (error) throw error;
      return data as LyricsResult;
    },
    onSuccess: (data, variables) => {
      setSelectedResult(variables);
      setLyrics(data);
      if (!data.found) {
        toast({ title: "Letra não encontrada", variant: "destructive" });
      }
    },
    onError: (error) => {
      toast({ title: "Erro ao buscar letra", description: String(error), variant: "destructive" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    searchMutation.mutate(searchQuery);
  };

  const handleSelectLyrics = () => {
    if (lyrics?.found && lyrics.lyrics) {
      onSelect({
        titulo: lyrics.title || selectedResult?.title || "",
        artista: lyrics.artist || selectedResult?.artist || "",
        letra: lyrics.lyrics,
      });
      // Reset state
      setSearchQuery("");
      setSearchResults([]);
      setSelectedResult(null);
      setLyrics(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedResult(null);
    setLyrics(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-destructive" />
            Buscar Letra no Vagalume
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Digite o nome da música ou artista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" disabled={searchMutation.isPending}>
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Lista de resultados */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Resultados da Busca</Label>
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchMutation.isPending
                    ? "Buscando..."
                    : "Digite o nome da música para buscar"}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <Card
                      key={result.id}
                      className={`cursor-pointer transition-colors hover:border-destructive/50 ${
                        selectedResult?.id === result.id ? "border-destructive" : ""
                      }`}
                      onClick={() => lyricsMutation.mutate(result)}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.artist}
                        </p>
                        {lyricsMutation.isPending && lyricsMutation.variables?.id === result.id && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Carregando letra...
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Preview da letra */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Preview da Letra</Label>
            <ScrollArea className="h-[300px] border rounded-lg p-3 bg-muted/30">
              {!lyrics ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Selecione uma música para ver a letra
                </div>
              ) : !lyrics.found ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Letra não encontrada no Vagalume
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="font-medium text-sm">{lyrics.title}</div>
                  <div className="text-xs text-muted-foreground mb-3">{lyrics.artist}</div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {lyrics.lyrics}
                  </pre>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <a
            href="https://www.vagalume.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Vagalume.com.br
          </a>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSelectLyrics}
              disabled={!lyrics?.found}
            >
              <Check className="w-4 h-4 mr-2" />
              Usar esta Letra
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
