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
import { DateInput } from "@/components/ui/date-input";

interface CriancaVisitanteFormDialogProps {
  children?: React.ReactNode;
}

export function CriancaVisitanteFormDialog({ children }: CriancaVisitanteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    dataNascimento: "",
    genero: "",
    nomeResponsavel: "",
    whatsappResponsavel: "",
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      dataNascimento: "",
      genero: "",
      nomeResponsavel: "",
      whatsappResponsavel: "",
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

  const uploadPhoto = async (criancaId: string): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `visitante-${criancaId}-${Date.now()}.${fileExt}`;
    const filePath = `kids/${fileName}`;

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
      // Buscar membro responsável pelo whatsapp (se informado)
      let membroResponsavelId: string | null = null;
      
      if (formData.whatsappResponsavel) {
        const { data: responsavel } = await supabase
          .from("members")
          .select("id")
          .eq("whatsapp", formData.whatsappResponsavel.replace(/\D/g, ""))
          .maybeSingle();
        
        membroResponsavelId = responsavel?.id || null;
      }

      // Criar novo convertido como criança visitante
      const { data: novoConvertido, error: ncError } = await supabase
        .from("novos_convertidos")
        .insert({
          full_name: formData.nome.trim(),
          data_nascimento: formData.dataNascimento || null,
          genero: formData.genero || null,
          como_chegou: "culto_domingo" as const,
          tipo_conversao: null,
          membro_vinculado_id: membroResponsavelId,
          responsavel_nome: formData.nomeResponsavel.trim() || null,
          responsavel_whatsapp: formData.whatsappResponsavel.replace(/\D/g, "") || null,
        })
        .select()
        .single();

      if (ncError) throw ncError;

      // Upload de foto se houver
      if (photoFile) {
        const photoUrl = await uploadPhoto(novoConvertido.id);
        if (photoUrl) {
          // Atualizar com a URL da foto (usando campo whatsapp temporariamente para foto visitante)
          // Por ora, não há campo photo_url em novos_convertidos, então a foto ficará apenas para membros
        }
      }

      // Se tiver responsável vinculado como membro, criar também em kids_responsaveis
      if (membroResponsavelId) {
        await supabase.from("kids_responsaveis").insert({
          crianca_novo_convertido_id: novoConvertido.id,
          responsavel_member_id: membroResponsavelId,
          parentesco: "responsavel",
          principal: true,
          notificar_ausencia: true,
        });
      }

      return novoConvertido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      toast.success("Criança visitante cadastrada com sucesso!");
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      console.error("Erro ao cadastrar criança:", error);
      toast.error("Erro ao cadastrar criança visitante");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!formData.dataNascimento) {
      toast.error("Data de nascimento é obrigatória");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white shadow-lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Criança
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">🎈 Cadastrar Criança Visitante</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload de foto */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24 border-4 border-muted">
              <AvatarImage src={photoPreview || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-2xl">
                {formData.nome.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <CameraPhotoInput
              onPhotoCapture={handlePhotoChange}
              photoPreview={photoPreview}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Criança *</Label>
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
              <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
              <DateInput
                id="dataNascimento"
                value={formData.dataNascimento}
                onChange={(value) => setFormData((prev) => ({ ...prev, dataNascimento: value }))}
                required
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

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">👨‍👩‍👧 Responsável</h4>
            
            <div className="space-y-2">
              <Label htmlFor="nomeResponsavel">Nome do Responsável</Label>
              <Input
                id="nomeResponsavel"
                value={formData.nomeResponsavel}
                onChange={(e) => setFormData((prev) => ({ ...prev, nomeResponsavel: e.target.value }))}
                placeholder="Nome do pai/mãe/responsável"
              />
            </div>

            <div className="space-y-2 mt-3">
              <Label htmlFor="whatsappResponsavel">WhatsApp do Responsável</Label>
              <Input
                id="whatsappResponsavel"
                value={formData.whatsappResponsavel}
                onChange={(e) => setFormData((prev) => ({ 
                  ...prev, 
                  whatsappResponsavel: formatPhone(e.target.value) 
                }))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Alergias, necessidades especiais, etc."
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
              className="bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500"
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