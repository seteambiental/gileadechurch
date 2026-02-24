import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, ImagePlus, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "melhoria" | "erro" | "implementacao";
}

const TITLES: Record<string, string> = {
  melhoria: "Nova Melhoria",
  erro: "Novo Erro",
  implementacao: "Nova Implementação",
};

const DESC_LABELS: Record<string, string> = {
  melhoria: "Descrição da Melhoria",
  erro: "Descrição do Erro",
  implementacao: "Descrição da Implementação",
};

const SistemaSolicitacaoFormDialog = ({ open, onOpenChange, tipo }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [card, setCard] = useState("");
  const [aba, setAba] = useState("");
  const [subAba, setSubAba] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let nome = user?.email || "Usuário";
      const { data: memberData } = await supabase
        .from("members")
        .select("full_name")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      if (memberData?.full_name) nome = memberData.full_name;

      let imagem_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("sistema-solicitacoes")
          .upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("sistema-solicitacoes")
          .getPublicUrl(path);
        imagem_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("sistema_solicitacoes").insert({
        tipo,
        descricao,
        card: card || null,
        aba: aba || null,
        sub_aba: subAba || null,
        solicitante_id: user!.id,
        solicitante_nome: nome,
        imagem_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistema_solicitacoes", tipo] });
      toast.success("Solicitação enviada com sucesso!");
      resetForm();
      onOpenChange(false);
    },
    onError: () => toast.error("Erro ao enviar solicitação"),
  });

  const resetForm = () => {
    setDescricao("");
    setCard("");
    setAba("");
    setSubAba("");
    removeImage();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLES[tipo]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{DESC_LABELS[tipo]} *</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva detalhadamente..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Card</Label>
              <Input value={card} onChange={(e) => setCard(e.target.value)} placeholder="Ex: Membros" />
            </div>
            <div className="space-y-2">
              <Label>Aba</Label>
              <Input value={aba} onChange={(e) => setAba(e.target.value)} placeholder="Ex: Cadastros" />
            </div>
            <div className="space-y-2">
              <Label>Sub-aba</Label>
              <Input value={subAba} onChange={(e) => setSubAba(e.target.value)} placeholder="Ex: Geral" />
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-md border border-border" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para anexar imagem da tela</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Enviar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SistemaSolicitacaoFormDialog;
