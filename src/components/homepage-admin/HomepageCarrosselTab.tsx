import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, ExternalLink, Download, ImageIcon, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { resizeForCarousel, resizeForCarouselMobile } from "@/lib/image-resize";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface CarrosselItem {
  id: string;
  titulo: string;
  imagem_url: string;
  imagem_url_mobile: string | null;
  link_url: string | null;
  ordem: number;
  ativo: boolean;
  link_evento_id?: string | null;
  reprocessado?: boolean;
}

const HomepageCarrosselTab = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CarrosselItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CarrosselItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [imagemUrlMobile, setImagemUrlMobile] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkEventoId, setLinkEventoId] = useState<string>("");
  const [ativo, setAtivo] = useState(true);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["homepage-carrossel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_carrossel")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as CarrosselItem[];
    },
  });

  // Eventos futuros com inscrição aberta, para vincular ao slide
  const { data: eventos = [] } = useQuery({
    queryKey: ["homepage-carrossel-eventos-inscricao"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, necessita_inscricao, status, ativo")
        .eq("necessita_inscricao", true)
        .eq("ativo", true)
        .gte("data_evento", today)
        .order("data_evento", { ascending: true });
      if (error) return [] as any[];
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<CarrosselItem>) => {
      if (editingItem) {
        const { error } = await supabase
          .from("homepage_carrossel")
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const maxOrdem = items.length > 0 ? Math.max(...items.map(i => i.ordem)) + 1 : 1;
        const insertPayload = { ...payload, ordem: maxOrdem } as any;
        const { error } = await supabase
          .from("homepage_carrossel")
          .insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-carrossel"] });
      toast.success(editingItem ? "Item atualizado!" : "Item adicionado!");
      handleCloseForm();
    },
    onError: () => {
      toast.error("Erro ao salvar item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_carrossel").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-carrossel"] });
      toast.success("Item excluído!");
      setDeleteItem(null);
    },
    onError: () => {
      toast.error("Erro ao excluir item");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newOrdem }: { id: string; newOrdem: number }) => {
      const { error } = await supabase
        .from("homepage_carrossel")
        .update({ ordem: newOrdem })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-carrossel"] });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("homepage_carrossel")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-carrossel"] });
    },
  });

  const handleOpenForm = (item?: CarrosselItem) => {
    if (item) {
      setEditingItem(item);
      setTitulo(item.titulo);
      setImagemUrl(item.imagem_url);
      setImagemUrlMobile(item.imagem_url_mobile || "");
      setLinkUrl(item.link_url || "");
      setLinkEventoId(item.link_evento_id || "");
      setAtivo(item.ativo);
    } else {
      setEditingItem(null);
      setTitulo("");
      setImagemUrl("");
      setImagemUrlMobile("");
      setLinkUrl("");
      setLinkEventoId("");
      setAtivo(true);
    }
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingItem(null);
    setTitulo("");
    setImagemUrl("");
    setImagemUrlMobile("");
    setLinkUrl("");
    setLinkEventoId("");
    setAtivo(true);
  };

  const handleSubmit = () => {
    if (!titulo.trim() || !imagemUrl.trim()) {
      toast.error("Título e imagem são obrigatórios");
      return;
    }
    saveMutation.mutate({
      titulo: titulo.trim(),
      imagem_url: imagemUrl.trim(),
      imagem_url_mobile: imagemUrlMobile.trim() || null,
      link_url: linkUrl.trim() || null,
      link_evento_id: linkEventoId || null,
      ativo,
    } as any);
  };

  const uploadVariant = async (
    file: File,
    variant: "desktop" | "mobile",
  ): Promise<string> => {
    const { file: resizedFile } =
      variant === "desktop"
        ? await resizeForCarousel(file)
        : await resizeForCarouselMobile(file);

    const fileName = `carrossel/${Date.now()}-${variant}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("encontros-fotos")
      .upload(fileName, resizedFile, {
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("encontros-fotos")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      toast.info("Processando imagem desktop (16:9)...");
      const url = await uploadVariant(file, "desktop");
      setImagemUrl(url);
      toast.success("Imagem desktop enviada (1920×1080)!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar imagem desktop");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUploadMobile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMobile(true);
    try {
      toast.info("Processando imagem mobile (9:16)...");
      const url = await uploadVariant(file, "mobile");
      setImagemUrlMobile(url);
      toast.success("Imagem mobile enviada!");
    } catch (error) {
      console.error("Erro no upload mobile:", error);
      toast.error("Erro ao enviar imagem mobile");
    } finally {
      setUploadingMobile(false);
    }
  };

  const moveItem = (item: CarrosselItem, direction: "up" | "down") => {
    const currentIndex = items.findIndex(i => i.id === item.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const targetItem = items[targetIndex];
    
    // Swap ordens
    reorderMutation.mutate({ id: item.id, newOrdem: targetItem.ordem });
    reorderMutation.mutate({ id: targetItem.id, newOrdem: item.ordem });
  };

  const reprocessItem = async (item: CarrosselItem) => {
    setReprocessingId(item.id);
    try {
      toast.info("Reprocessando imagens...");
      const fetchAsFile = async (url: string, name: string) => {
        const res = await fetch(url, { cache: "no-store" });
        const blob = await res.blob();
        return new File([blob], name, { type: blob.type || "image/jpeg" });
      };

      const updates: Partial<CarrosselItem> = {};

      if (item.imagem_url) {
        const file = await fetchAsFile(item.imagem_url, "desktop.jpg");
        updates.imagem_url = await uploadVariant(file, "desktop");
      }
      if (item.imagem_url_mobile) {
        const file = await fetchAsFile(item.imagem_url_mobile, "mobile.jpg");
        updates.imagem_url_mobile = await uploadVariant(file, "mobile");
      }

      const { error } = await supabase
        .from("homepage_carrossel")
        .update(updates)
        .eq("id", item.id);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["homepage-carrossel"] });
      toast.success("Imagem reprocessada!");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível reprocessar. Reenvie a imagem manualmente.");
    } finally {
      setReprocessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Carrossel da Homepage</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os flyers que aparecem no carrossel principal
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum item no carrossel</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={item.id} className={!item.ativo ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item, "up")}
                      disabled={index === 0}
                      className="h-6 w-6"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item, "down")}
                      disabled={index === items.length - 1}
                      className="h-6 w-6"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>

                  <img
                    src={item.imagem_url}
                    alt={item.titulo}
                    className="w-24 h-16 object-cover rounded-lg"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.titulo}</h3>
                    {item.link_url && (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link
                      </a>
                    )}
                  </div>

                  <Switch
                    checked={item.ativo}
                    onCheckedChange={(checked) =>
                      toggleAtivoMutation.mutate({ id: item.id, ativo: checked })
                    }
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    title="Baixar imagem"
                    onClick={async () => {
                      try {
                        const response = await fetch(item.imagem_url);
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${item.titulo.replace(/\s+/g, "-")}.${blob.type.split("/")[1] || "png"}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast.error("Erro ao baixar imagem");
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    title="Reprocessar para encaixar no carrossel"
                    disabled={reprocessingId === item.id}
                    onClick={() => reprocessItem(item)}
                  >
                    {reprocessingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenForm(item)}
                  >
                    Editar
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteItem(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Item" : "Novo Item do Carrossel"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Nome do flyer"
              />
            </div>

            <div>
              <Label>Imagem Desktop * (16:9 — ideal 1920×1080)</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </div>
                )}
                {imagemUrl && (
                  <img
                    src={imagemUrl}
                    alt="Preview"
                    className="w-full max-w-xs h-auto rounded-lg"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Ou cole a URL diretamente:
                </p>
                <Input
                  value={imagemUrl}
                  onChange={(e) => setImagemUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label>Imagem Mobile (9:16 — ideal 1080×1920)</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadMobile}
                  disabled={uploadingMobile}
                />
                {uploadingMobile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </div>
                )}
                {imagemUrlMobile && (
                  <img
                    src={imagemUrlMobile}
                    alt="Preview Mobile"
                    className="w-40 h-auto rounded-lg"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Opcional. Se não for enviada, a versão desktop será usada também no celular.
                </p>
                <Input
                  value={imagemUrlMobile}
                  onChange={(e) => setImagemUrlMobile(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label>Link (opcional)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://... ou /inscricao/..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL para onde o usuário será direcionado ao clicar
              </p>
            </div>

            <div>
              <Label>Vincular a um evento com inscrição (opcional)</Label>
              <Select
                value={linkEventoId || "__none__"}
                onValueChange={(v) => setLinkEventoId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum evento vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum (usar Link acima)</SelectItem>
                  {eventos.map((ev: any) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.titulo} — {new Date(ev.data_evento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Se selecionado, clicar na imagem leva direto ao formulário de inscrição do evento.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <Label>Ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteItem?.titulo}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HomepageCarrosselTab;
