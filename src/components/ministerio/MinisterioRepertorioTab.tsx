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
  X,
  Calendar,
  Share2,
  Check
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface MusicaForm {
  titulo: string;
  artista: string;
  tom: string;
  video_url: string;
  observacoes: string;
}

interface MusicaBanco {
  id: string;
  titulo: string;
  artista: string | null;
  tom: string | null;
  video_url: string | null;
  vezes_tocada: number;
}

interface Ministry {
  id: string;
  name: string;
}

const TONS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
  "Cm", "C#m", "Dbm", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gbm", "Gm", "G#m", "Abm", "Am", "A#m", "Bbm", "Bm"
];

const TIPOS_CULTO = [
  { value: "domingo", label: "Domingo" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "especial", label: "Especial" },
  { value: "evento", label: "Evento" },
];

const TIPOS_CULTO_MAP: Record<string, string> = {
  domingo: "Domingo",
  quarta: "Quarta-feira",
  especial: "Especial",
  evento: "Evento",
};

export const MinisterioRepertorioTab = ({ ministryId }: MinisterioRepertorioTabProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [showNewEscalaDialog, setShowNewEscalaDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [escalaToShare, setEscalaToShare] = useState<Escala | null>(null);
  const [editingMusica, setEditingMusica] = useState<Musica | null>(null);
  const [deleteMusica, setDeleteMusica] = useState<Musica | null>(null);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  
  // Autocomplete states
  const [openAutocomplete, setOpenAutocomplete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form para editar música individual
  const [musicaForm, setMusicaForm] = useState<MusicaForm>({
    titulo: "",
    artista: "",
    tom: "",
    video_url: "",
    observacoes: "",
  });

  // Form para nova escala com múltiplas músicas
  const [novaEscalaForm, setNovaEscalaForm] = useState({
    data_culto: "",
    tipo_culto: "domingo",
  });
  const [novasMusicasForm, setNovasMusicasForm] = useState<MusicaForm[]>([
    { titulo: "", artista: "", tom: "", video_url: "", observacoes: "" }
  ]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch banco de músicas para autocomplete
  const { data: musicasBanco = [] } = useQuery({
    queryKey: ["ministerio-musicas-banco", ministryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministerio_musicas_banco")
        .select("*")
        .eq("ministry_id", ministryId)
        .order("vezes_tocada", { ascending: false });
      if (error) throw error;
      return data as MusicaBanco[];
    },
  });

  // Fetch ministérios para compartilhamento (Dança e Mídia)
  const { data: ministries = [] } = useQuery({
    queryKey: ["ministries-for-share"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name")
        .or("name.ilike.%dança%,name.ilike.%midia%,name.ilike.%mídia%,name.ilike.%dance%,name.ilike.%media%")
        .order("name");
      if (error) throw error;
      return data as Ministry[];
    },
  });

  // Fetch compartilhamentos existentes
  const { data: compartilhamentos = [] } = useQuery({
    queryKey: ["escalas-compartilhadas", escalaToShare?.id],
    queryFn: async () => {
      if (!escalaToShare) return [];
      const { data, error } = await supabase
        .from("ministerio_escalas_compartilhadas")
        .select("ministry_destino_id")
        .eq("escala_id", escalaToShare.id);
      if (error) throw error;
      return data.map(c => c.ministry_destino_id);
    },
    enabled: !!escalaToShare,
  });

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

  // Filtrar músicas para autocomplete
  const filteredMusicasBanco = useMemo(() => {
    if (!searchQuery) return musicasBanco.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return musicasBanco
      .filter(m => 
        m.titulo.toLowerCase().includes(query) || 
        m.artista?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [musicasBanco, searchQuery]);

  // Agrupar músicas por escala
  const musicasByEscala = useMemo(() => {
    const grouped: Record<string, Musica[]> = {};
    repertorio.forEach(m => {
      if (!grouped[m.escala_id]) grouped[m.escala_id] = [];
      grouped[m.escala_id].push(m);
    });
    return grouped;
  }, [repertorio]);

  // Salvar música no banco de músicas
  const saveToBanco = async (musica: MusicaForm, dataCulto: string) => {
    if (!musica.titulo.trim()) return;
    
    // Tentar fazer upsert no banco de músicas
    const { error } = await supabase
      .from("ministerio_musicas_banco")
      .upsert({
        ministry_id: ministryId,
        titulo: musica.titulo.trim(),
        artista: musica.artista || null,
        tom: musica.tom || null,
        video_url: musica.video_url || null,
        ultima_vez_tocada: dataCulto,
        vezes_tocada: 1,
      }, {
        onConflict: "ministry_id,titulo,artista",
        ignoreDuplicates: false,
      });
    
    if (error && !error.message.includes("duplicate")) {
      console.error("Erro ao salvar no banco:", error);
    }
  };

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

      // Salvar no banco de músicas
      await saveToBanco(musicaForm, selectedEscala.data_culto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-repertorio"] });
      queryClient.invalidateQueries({ queryKey: ["ministerio-musicas-banco"] });
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

  // Mutation para criar nova escala com músicas
  const createEscalaMutation = useMutation({
    mutationFn: async () => {
      // Criar a escala
      const { data: escala, error: escalaError } = await supabase
        .from("ministerio_escalas")
        .insert({
          ministry_id: ministryId,
          data_culto: novaEscalaForm.data_culto,
          tipo_culto: novaEscalaForm.tipo_culto,
        })
        .select()
        .single();

      if (escalaError) throw escalaError;

      // Inserir as músicas (somente as que têm título)
      const musicasValidas = novasMusicasForm.filter(m => m.titulo.trim());
      if (musicasValidas.length > 0) {
        const musicasToInsert = musicasValidas.map((m, index) => ({
          escala_id: escala.id,
          ministry_id: ministryId,
          titulo: m.titulo,
          artista: m.artista || null,
          tom: m.tom || null,
          video_url: m.video_url || null,
          observacoes: m.observacoes || null,
          ordem: index + 1,
        }));

        const { error: musicasError } = await supabase
          .from("ministerio_repertorio")
          .insert(musicasToInsert);

        if (musicasError) throw musicasError;

        // Salvar todas no banco de músicas
        for (const musica of musicasValidas) {
          await saveToBanco(musica, novaEscalaForm.data_culto);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas-repertorio"] });
      queryClient.invalidateQueries({ queryKey: ["ministerio-repertorio"] });
      queryClient.invalidateQueries({ queryKey: ["ministerio-escalas"] });
      queryClient.invalidateQueries({ queryKey: ["ministerio-musicas-banco"] });
      toast({ title: "Escala criada com sucesso!" });
      resetNovaEscalaForm();
    },
    onError: (error) => {
      toast({ title: "Erro ao criar escala", description: String(error), variant: "destructive" });
    },
  });

  // Mutation para compartilhar escala
  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!escalaToShare || selectedMinistries.length === 0) return;

      // Remover compartilhamentos anteriores
      await supabase
        .from("ministerio_escalas_compartilhadas")
        .delete()
        .eq("escala_id", escalaToShare.id);

      // Inserir novos compartilhamentos
      const compartilhamentosToInsert = selectedMinistries.map(ministryId => ({
        escala_id: escalaToShare.id,
        ministry_destino_id: ministryId,
      }));

      const { error } = await supabase
        .from("ministerio_escalas_compartilhadas")
        .insert(compartilhamentosToInsert);

      if (error) throw error;

      // Enviar notificação via WhatsApp
      try {
        await supabase.functions.invoke('enviar-whatsapp', {
          body: {
            action: 'notificar_escala_compartilhada',
            escalaId: escalaToShare.id,
            ministeriosDestino: selectedMinistries,
            ministerioOrigem: 'Ministério de Louvor',
          }
        });
      } catch (whatsappError) {
        console.error('Erro ao enviar notificações WhatsApp:', whatsappError);
        // Não falhar a operação se o WhatsApp falhar
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas-compartilhadas"] });
      toast({ title: "Escala compartilhada e notificações enviadas!" });
      setShowShareDialog(false);
      setEscalaToShare(null);
      setSelectedMinistries([]);
    },
    onError: (error) => {
      toast({ title: "Erro ao compartilhar", description: String(error), variant: "destructive" });
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

  const resetNovaEscalaForm = () => {
    setShowNewEscalaDialog(false);
    setNovaEscalaForm({ data_culto: "", tipo_culto: "domingo" });
    setNovasMusicasForm([{ titulo: "", artista: "", tom: "", video_url: "", observacoes: "" }]);
    setOpenAutocomplete(null);
    setSearchQuery("");
  };

  const addNovaMusicaField = () => {
    setNovasMusicasForm([...novasMusicasForm, { titulo: "", artista: "", tom: "", video_url: "", observacoes: "" }]);
  };

  const removeNovaMusicaField = (index: number) => {
    if (novasMusicasForm.length > 1) {
      setNovasMusicasForm(novasMusicasForm.filter((_, i) => i !== index));
    }
  };

  const updateNovaMusicaField = (index: number, field: keyof MusicaForm, value: string) => {
    const updated = [...novasMusicasForm];
    updated[index] = { ...updated[index], [field]: value };
    setNovasMusicasForm(updated);
  };

  const selectMusicaFromBanco = (index: number, musica: MusicaBanco) => {
    const updated = [...novasMusicasForm];
    updated[index] = {
      titulo: musica.titulo,
      artista: musica.artista || "",
      tom: musica.tom || "",
      video_url: musica.video_url || "",
      observacoes: "",
    };
    setNovasMusicasForm(updated);
    setOpenAutocomplete(null);
    setSearchQuery("");
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

  const handleOpenShare = (escala: Escala) => {
    setEscalaToShare(escala);
    setShowShareDialog(true);
  };

  // Setar ministérios selecionados quando buscar compartilhamentos
  useMemo(() => {
    if (compartilhamentos.length > 0) {
      setSelectedMinistries(compartilhamentos);
    }
  }, [compartilhamentos]);

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-6">
      {/* Header com navegação de mês e botão nova escala */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-lg font-semibold text-foreground">Repertório</h2>
        <div className="flex items-center gap-3">
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
          <Button onClick={() => setShowNewEscalaDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Incluir Escala
          </Button>
        </div>
      </div>

      {/* Lista de escalas com repertório */}
      {escalas.length === 0 ? (
        <Card className="bg-muted/30 border-border">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma escala cadastrada para este mês.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowNewEscalaDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira escala
            </Button>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-medium capitalize">
                        {dataFormatada}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {TIPOS_CULTO_MAP[escala.tipo_culto] || escala.tipo_culto}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenShare(escala)}
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Compartilhar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMusica(escala)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Música
                      </Button>
                    </div>
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
              <div className="relative">
                <Input
                  value={musicaForm.titulo}
                  onChange={(e) => {
                    setMusicaForm({ ...musicaForm, titulo: e.target.value });
                    setSearchQuery(e.target.value);
                    if (e.target.value.length >= 2) {
                      setOpenAutocomplete(-1);
                    } else {
                      setOpenAutocomplete(null);
                    }
                  }}
                  onBlur={() => setTimeout(() => setOpenAutocomplete(null), 200)}
                  placeholder="Digite o nome da música"
                />
                {openAutocomplete === -1 && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-auto">
                    {filteredMusicasBanco.length > 0 ? (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                          Sugestões do banco
                        </div>
                        {filteredMusicasBanco.map((musica) => (
                          <div
                            key={musica.id}
                            className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center justify-between"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setMusicaForm({
                                titulo: musica.titulo,
                                artista: musica.artista || "",
                                tom: musica.tom || "",
                                video_url: musica.video_url || "",
                                observacoes: "",
                              });
                              setOpenAutocomplete(null);
                              setSearchQuery("");
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{musica.titulo}</span>
                              {musica.artista && (
                                <span className="text-xs text-muted-foreground">{musica.artista}</span>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs ml-2">
                              {musica.vezes_tocada}x
                            </Badge>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhuma música encontrada
                      </div>
                    )}
                    <div className="border-t">
                      <div
                        className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center gap-2 text-primary"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setOpenAutocomplete(null);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Usar "{searchQuery}" como nova música</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Digite para buscar ou cadastrar uma nova música
              </p>
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

      {/* Dialog para criar nova escala com músicas */}
      <Dialog open={showNewEscalaDialog} onOpenChange={(open) => !open && resetNovaEscalaForm()}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Incluir Escala
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Dados da escala */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data da Escala *</Label>
                  <Input
                    type="date"
                    value={novaEscalaForm.data_culto}
                    onChange={(e) => setNovaEscalaForm({ ...novaEscalaForm, data_culto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo de Culto</Label>
                  <Select
                    value={novaEscalaForm.tipo_culto}
                    onValueChange={(v) => setNovaEscalaForm({ ...novaEscalaForm, tipo_culto: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_CULTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lista de músicas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Músicas</Label>
                  {musicasBanco.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {musicasBanco.length} músicas no banco
                    </Badge>
                  )}
                </div>

                {novasMusicasForm.map((musica, index) => (
                  <Card key={index} className="bg-muted/30 border-border">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Música {index + 1}
                        </span>
                        {novasMusicasForm.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeNovaMusicaField(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nome da Música *</Label>
                          <div className="relative">
                            <Input
                              value={musica.titulo}
                              onChange={(e) => {
                                updateNovaMusicaField(index, "titulo", e.target.value);
                                setSearchQuery(e.target.value);
                                if (e.target.value.length >= 2) {
                                  setOpenAutocomplete(index);
                                } else {
                                  setOpenAutocomplete(null);
                                }
                              }}
                              onBlur={() => setTimeout(() => setOpenAutocomplete(null), 200)}
                              placeholder="Digite para buscar ou criar..."
                            />
                            {openAutocomplete === index && searchQuery.length >= 2 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[250px] overflow-auto">
                                {filteredMusicasBanco.length > 0 ? (
                                  <>
                                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                                      Sugestões
                                    </div>
                                    {filteredMusicasBanco.map((m) => (
                                      <div
                                        key={m.id}
                                        className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center justify-between"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          selectMusicaFromBanco(index, m);
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-sm">{m.titulo}</span>
                                          {m.artista && (
                                            <span className="text-xs text-muted-foreground">{m.artista}</span>
                                          )}
                                        </div>
                                        <Badge variant="outline" className="text-xs ml-2">
                                          {m.vezes_tocada}x
                                        </Badge>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    Nenhuma sugestão
                                  </div>
                                )}
                                <div className="border-t">
                                  <div
                                    className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center gap-2 text-primary"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setOpenAutocomplete(null);
                                    }}
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span className="text-xs font-medium">Criar nova: "{searchQuery}"</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Artista/Banda</Label>
                          <Input
                            value={musica.artista}
                            onChange={(e) => updateNovaMusicaField(index, "artista", e.target.value)}
                            placeholder="Ex: Gabriela Rocha"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Tom</Label>
                          <Select
                            value={musica.tom}
                            onValueChange={(v) => updateNovaMusicaField(index, "tom", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
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
                          <Label className="text-xs">Link do Vídeo (YouTube)</Label>
                          <Input
                            value={musica.video_url}
                            onChange={(e) => updateNovaMusicaField(index, "video_url", e.target.value)}
                            placeholder="https://youtube.com/..."
                          />
                        </div>
                      </div>

                      {musica.video_url && extractVideoId(musica.video_url) && (
                        <div className="rounded-lg overflow-hidden aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${extractVideoId(musica.video_url)}`}
                            className="w-full h-full"
                            allowFullScreen
                            title={`Preview - ${musica.titulo || 'Vídeo'}`}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addNovaMusicaField}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar mais música
                </Button>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={resetNovaEscalaForm}>
              Fechar
            </Button>
            <Button
              onClick={() => createEscalaMutation.mutate()}
              disabled={
                !novaEscalaForm.data_culto || 
                !novasMusicasForm.some(m => m.titulo.trim()) ||
                createEscalaMutation.isPending
              }
            >
              {createEscalaMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para compartilhar escala */}
      <Dialog open={showShareDialog} onOpenChange={(open) => {
        if (!open) {
          setShowShareDialog(false);
          setEscalaToShare(null);
          setSelectedMinistries([]);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Compartilhar Escala
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {escalaToShare && (
              <p className="text-sm text-muted-foreground">
                Compartilhar escala de{" "}
                <strong>
                  {format(new Date(escalaToShare.data_culto + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                </strong>{" "}
                com os ministérios:
              </p>
            )}

            <div className="space-y-3">
              {ministries.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum ministério de Dança ou Mídia cadastrado.
                </p>
              ) : (
                ministries.map((ministry) => (
                  <div
                    key={ministry.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <Checkbox
                      id={ministry.id}
                      checked={selectedMinistries.includes(ministry.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMinistries([...selectedMinistries, ministry.id]);
                        } else {
                          setSelectedMinistries(selectedMinistries.filter(id => id !== ministry.id));
                        }
                      }}
                    />
                    <Label htmlFor={ministry.id} className="flex-1 cursor-pointer">
                      {ministry.name}
                    </Label>
                    {compartilhamentos.includes(ministry.id) && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Já compartilhado
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowShareDialog(false);
              setEscalaToShare(null);
              setSelectedMinistries([]);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={selectedMinistries.length === 0 || shareMutation.isPending}
            >
              {shareMutation.isPending ? "Compartilhando..." : "Compartilhar"}
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
