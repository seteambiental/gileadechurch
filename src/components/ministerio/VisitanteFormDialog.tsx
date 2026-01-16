import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/masks";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";

interface VisitanteFormDialogProps {
  ministerioSlug: string;
  ministerioTitle: string;
  children?: React.ReactNode;
}

export function VisitanteFormDialog({ ministerioSlug, ministerioTitle, children }: VisitanteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    dataNascimento: "",
    genero: "",
    whatsapp: "",
    email: "",
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      dataNascimento: "",
      genero: "",
      whatsapp: "",
      email: "",
      observacoes: "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoChange = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A foto deve ter no máximo 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  const uploadPhoto = async (visitanteId: string): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `visitante-${ministerioSlug}-${visitanteId}-${Date.now()}.${fileExt}`;
    const filePath = `visitantes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("member-photos")
      .upload(filePath, photoFile);

    if (uploadError) {
      console.error("Erro ao fazer upload da foto:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("member-photos")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Criar novo convertido como visitante do ministério
      const insertData = {
        full_name: formData.nome.trim(),
        data_nascimento: formData.dataNascimento || null,
        genero: formData.genero || null,
        whatsapp: formData.whatsapp.replace(/\D/g, "") || null,
        email: formData.email.trim() || null,
        como_chegou: "culto_domingo" as const,
        observacoes: `Visitante ${ministerioTitle}${formData.observacoes ? `. ${formData.observacoes}` : ""}`,
      };
      
      const { data: novoConvertido, error: ncError } = await supabase
        .from("novos_convertidos")
        .insert(insertData)
        .select()
        .single();

      if (ncError) throw ncError;

      // Upload de foto se houver
      if (photoFile && novoConvertido) {
        const photoUrl = await uploadPhoto(novoConvertido.id);
        if (photoUrl) {
          await supabase
            .from("novos_convertidos")
            .update({ photo_url: photoUrl })
            .eq("id", novoConvertido.id);
        }
      }

      return novoConvertido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitantes-ministerio", ministerioSlug] });
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos"] });
      toast.success("Visitante cadastrado com sucesso!");
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao cadastrar visitante:", error);
      toast.error("Erro ao cadastrar visitante");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    createMutation.mutate();
  };

  const getEmoji = () => {
    switch (ministerioSlug) {
      case "flow": return "🔥";
      case "gt": return "✨";
      case "homens": return "👨";
      case "mulheres": return "👩";
      default: return "👤";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-to-r from-secondary to-destructive hover:opacity-90 text-white shadow-lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Visitante
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{getEmoji()} Cadastrar Visitante - {ministerioTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload de foto */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24 border-4 border-muted">
              <AvatarImage src={photoPreview || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-secondary/20 to-destructive/20 text-2xl">
                {formData.nome.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <CameraPhotoInput
              onPhotoCapture={handlePhotoChange}
              photoPreview={photoPreview}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData((prev) => ({ ...prev, dataNascimento: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Select
                value={formData.genero}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, genero: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData((prev) => ({ 
                ...prev, 
                whatsapp: formatPhone(e.target.value) 
              }))}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-secondary to-destructive hover:opacity-90"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
