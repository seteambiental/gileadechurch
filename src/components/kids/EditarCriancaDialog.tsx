import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserCheck, Camera } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/masks";

interface EditarCriancaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crianca: {
    id: string;
    nome: string;
    idade: number;
    genero: string | null;
    whatsapp: string | null;
    foto?: string | null;
    tipo: "membro" | "novo_convertido";
  } | null;
}

export function EditarCriancaDialog({ open, onOpenChange, crianca }: EditarCriancaDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    dataNascimento: "",
    genero: "",
    responsavelNome: "",
    responsavelWhatsapp: "",
  });

  // Buscar dados completos da criança
  const { data: dadosCompletos, isLoading: loadingDados } = useQuery({
    queryKey: ["crianca-detalhes", crianca?.id, crianca?.tipo],
    queryFn: async () => {
      if (!crianca) return null;
      
      if (crianca.tipo === "novo_convertido") {
        const { data, error } = await supabase
          .from("novos_convertidos")
          .select("*")
          .eq("id", crianca.id)
          .single();
        
        if (error) throw error;
        return { ...data, tipo: "novo_convertido" as const };
      } else {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .eq("id", crianca.id)
          .single();
        
        if (error) throw error;
        return { ...data, tipo: "membro" as const, data_nascimento: data.birth_date };
      }
    },
    enabled: !!crianca && open,
  });


  useEffect(() => {
    if (dadosCompletos) {
      const ncData = dadosCompletos as { 
        responsavel_nome?: string; 
        responsavel_whatsapp?: string;
        photo_url?: string;
        full_name?: string;
        data_nascimento?: string;
        genero?: string;
      };
      
      setFormData({
        nome: dadosCompletos.full_name || "",
        dataNascimento: dadosCompletos.data_nascimento || "",
        genero: dadosCompletos.genero || "",
        responsavelNome: ncData.responsavel_nome || "",
        responsavelWhatsapp: ncData.responsavel_whatsapp || "",
      });
      setPhotoPreview(ncData.photo_url || null);
    }
  }, [dadosCompletos]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [open]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    }
  };

  const uploadPhoto = async (criancaId: string, tipo: "membro" | "novo_convertido"): Promise<string | null> => {
    if (!photoFile) return null;

    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${tipo}-${criancaId}-${Date.now()}.${fileExt}`;
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!crianca) return;
      
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(crianca.id, crianca.tipo);
      }
      
      if (crianca.tipo === "novo_convertido") {
        const updateData: Record<string, unknown> = {
          full_name: formData.nome.trim(),
          data_nascimento: formData.dataNascimento || null,
          genero: formData.genero || null,
          responsavel_nome: formData.responsavelNome.trim() || null,
          responsavel_whatsapp: formData.responsavelWhatsapp.replace(/\D/g, "") || null,
        };
        
        if (photoUrl) {
          updateData.photo_url = photoUrl;
        }
        
        const { error } = await supabase
          .from("novos_convertidos")
          .update(updateData)
          .eq("id", crianca.id);
        
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = {
          full_name: formData.nome.trim(),
          birth_date: formData.dataNascimento || null,
          genero: formData.genero || null,
        };
        if (photoUrl) {
          updateData.photo_url = photoUrl;
        }
        
        const { error } = await supabase
          .from("members")
          .update(updateData)
          .eq("id", crianca.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      queryClient.invalidateQueries({ queryKey: ["crianca-detalhes"] });
      toast.success("Criança atualizada com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao atualizar criança:", error);
      toast.error("Erro ao atualizar criança");
    },
  });

  const convertToMemberMutation = useMutation({
    mutationFn: async () => {
      if (!crianca || crianca.tipo !== "novo_convertido" || !dadosCompletos) return;
      
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(crianca.id, "membro");
      }
      
      // Criar membro a partir do novo convertido
      const ncData = dadosCompletos as { 
        full_name: string; data_nascimento: string; genero: string; whatsapp: string;
        email: string; cep: string; address: string; numero: string; complement: string;
        neighborhood: string; city: string; state: string; cpf: string;
      };
      
      const { data: novoMembro, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: ncData.full_name,
          birth_date: ncData.data_nascimento,
          genero: ncData.genero,
          whatsapp: ncData.whatsapp,
          email: ncData.email,
          cep: ncData.cep,
          address: ncData.address,
          number: ncData.numero,
          complement: ncData.complement,
          neighborhood: ncData.neighborhood,
          city: ncData.city,
          state: ncData.state,
          cpf: ncData.cpf,
          photo_url: photoUrl,
          member_since: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();
      
      if (memberError) throw memberError;

      // Atualizar novo convertido para marcar como membro
      await supabase
        .from("novos_convertidos")
        .update({
          tornou_membro: true,
          member_id: novoMembro.id,
          data_membresia: new Date().toISOString().split("T")[0],
        })
        .eq("id", crianca.id);

      // Atualizar responsáveis para apontar para o novo membro
      await supabase
        .from("kids_responsaveis")
        .update({
          crianca_member_id: novoMembro.id,
          crianca_novo_convertido_id: null,
        })
        .eq("crianca_novo_convertido_id", crianca.id);

      return novoMembro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
      toast.success("Criança convertida para membro com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao converter para membro:", error);
      toast.error("Erro ao converter para membro");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    updateMutation.mutate();
  };

  if (!crianca) return null;

  const isLoading = loadingDados;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            ✏️ Editar Criança {crianca.tipo === "novo_convertido" && "(Visitante)"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Upload de foto */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-muted">
                  <AvatarImage src={photoPreview || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-200 to-purple-200 text-2xl">
                    {crianca.nome.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">Clique no ícone para adicionar foto</p>
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

            {/* Campos de responsável - apenas para visitantes */}
            {crianca.tipo === "novo_convertido" && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">👨‍👩‍👧 Responsável</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="responsavelNome">Nome do Responsável</Label>
                  <Input
                    id="responsavelNome"
                    value={formData.responsavelNome}
                    onChange={(e) => setFormData((prev) => ({ ...prev, responsavelNome: e.target.value }))}
                    placeholder="Nome do pai/mãe/responsável"
                  />
                </div>

                <div className="space-y-2 mt-3">
                  <Label htmlFor="responsavelWhatsapp">WhatsApp do Responsável</Label>
                  <Input
                    id="responsavelWhatsapp"
                    value={formatPhone(formData.responsavelWhatsapp)}
                    onChange={(e) => setFormData((prev) => ({ 
                      ...prev, 
                      responsavelWhatsapp: e.target.value.replace(/\D/g, "")
                    }))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>

            {/* Botão converter para membro */}
            {crianca.tipo === "novo_convertido" && (
              <>
                <Separator />
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                    onClick={() => convertToMemberMutation.mutate()}
                    disabled={convertToMemberMutation.isPending}
                  >
                    {convertToMemberMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Converter para Membro
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Isso criará um cadastro completo de membro para esta criança
                  </p>
                </div>
              </>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}