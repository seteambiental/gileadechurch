import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserCheck } from "lucide-react";
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
    tipo: "membro" | "novo_convertido";
  } | null;
}

export function EditarCriancaDialog({ open, onOpenChange, crianca }: EditarCriancaDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nome: "",
    dataNascimento: "",
    genero: "",
    observacoes: "",
  });

  // Buscar dados completos do novo convertido
  const { data: dadosCompletos } = useQuery({
    queryKey: ["crianca-detalhes", crianca?.id, crianca?.tipo],
    queryFn: async () => {
      if (!crianca || crianca.tipo !== "novo_convertido") return null;
      
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("*")
        .eq("id", crianca.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!crianca && crianca.tipo === "novo_convertido",
  });

  // Buscar responsável vinculado
  const { data: responsavel } = useQuery({
    queryKey: ["crianca-responsavel", crianca?.id, crianca?.tipo],
    queryFn: async () => {
      if (!crianca) return null;
      
      const columnName = crianca.tipo === "membro" ? "crianca_member_id" : "crianca_novo_convertido_id";
      
      const { data, error } = await supabase
        .from("kids_responsaveis")
        .select("*, responsavel_member_id")
        .eq(columnName, crianca.id)
        .eq("principal", true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data?.responsavel_member_id) return null;
      
      // Buscar dados do responsável separadamente
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, whatsapp")
        .eq("id", data.responsavel_member_id)
        .single();
      
      if (memberError) return null;
      
      return { ...data, responsavel: memberData };
    },
    enabled: !!crianca,
  });

  useEffect(() => {
    if (dadosCompletos) {
      setFormData({
        nome: dadosCompletos.full_name || "",
        dataNascimento: dadosCompletos.data_nascimento || "",
        genero: dadosCompletos.genero || "",
        observacoes: "",
      });
    } else if (crianca) {
      setFormData({
        nome: crianca.nome || "",
        dataNascimento: "",
        genero: crianca.genero || "",
        observacoes: "",
      });
    }
  }, [dadosCompletos, crianca]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!crianca) return;
      
      if (crianca.tipo === "novo_convertido") {
        const { error } = await supabase
          .from("novos_convertidos")
          .update({
            full_name: formData.nome.trim(),
            data_nascimento: formData.dataNascimento || null,
            genero: formData.genero || null,
          })
          .eq("id", crianca.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("members")
          .update({
            full_name: formData.nome.trim(),
            birth_date: formData.dataNascimento || null,
            genero: formData.genero || null,
          })
          .eq("id", crianca.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["novos-convertidos-kids"] });
      queryClient.invalidateQueries({ queryKey: ["members-kids"] });
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
      
      // Criar membro a partir do novo convertido
      const { data: novoMembro, error: memberError } = await supabase
        .from("members")
        .insert({
          full_name: dadosCompletos.full_name,
          birth_date: dadosCompletos.data_nascimento,
          genero: dadosCompletos.genero,
          whatsapp: dadosCompletos.whatsapp,
          email: dadosCompletos.email,
          cep: dadosCompletos.cep,
          address: dadosCompletos.address,
          number: dadosCompletos.numero,
          complement: dadosCompletos.complement,
          neighborhood: dadosCompletos.neighborhood,
          city: dadosCompletos.city,
          state: dadosCompletos.state,
          cpf: dadosCompletos.cpf,
          rg: dadosCompletos.rg,
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
      if (responsavel) {
        await supabase
          .from("kids_responsaveis")
          .update({
            crianca_member_id: novoMembro.id,
            crianca_novo_convertido_id: null,
          })
          .eq("crianca_novo_convertido_id", crianca.id);
      }

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

  const responsavelInfo = responsavel?.responsavel as { id: string; full_name: string; whatsapp: string | null } | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            ✏️ Editar Criança {crianca.tipo === "novo_convertido" && "(Visitante)"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Info do responsável */}
          {responsavelInfo && (
            <div className="bg-muted/50 p-3 rounded-lg space-y-1">
              <Label className="text-xs text-muted-foreground">Responsável Principal</Label>
              <p className="font-medium">{responsavelInfo.full_name}</p>
              {responsavelInfo.whatsapp && (
                <p className="text-sm text-muted-foreground">📱 {responsavelInfo.whatsapp}</p>
              )}
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
      </DialogContent>
    </Dialog>
  );
}