import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCep, formatPhone } from "@/lib/masks";

interface CriancaVisitanteFormDialogProps {
  children?: React.ReactNode;
}

export function CriancaVisitanteFormDialog({ children }: CriancaVisitanteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    dataNascimento: "",
    genero: "",
    cep: "",
    address: "",
    numero: "",
    neighborhood: "",
    city: "",
    state: "",
    nomeResponsavel: "",
    whatsappResponsavel: "",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      dataNascimento: "",
      genero: "",
      cep: "",
      address: "",
      numero: "",
      neighborhood: "",
      city: "",
      state: "",
      nomeResponsavel: "",
      whatsappResponsavel: "",
    });
  };

  const handleCepChange = async (cep: string) => {
    const maskedCep = formatCep(cep);
    setFormData((prev) => ({ ...prev, cep: maskedCep }));

    const cleanCep = maskedCep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            address: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      // Criar novo convertido como criança visitante
      const { data: novoConvertido, error: ncError } = await supabase
        .from("novos_convertidos")
        .insert({
          full_name: formData.nome.trim(),
          data_nascimento: formData.dataNascimento || null,
          genero: formData.genero || null,
          cep: formData.cep || null,
          address: formData.address || null,
          numero: formData.numero || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
          como_chegou: "culto_domingo" as const,
          tipo_conversao: null,
        })
        .select()
        .single();

      if (ncError) throw ncError;

      // Se tiver responsável, buscar ou criar e vincular
      if (formData.nomeResponsavel && formData.whatsappResponsavel) {
        // Buscar membro responsável pelo whatsapp
        const { data: responsavel } = await supabase
          .from("members")
          .select("id")
          .eq("whatsapp", formData.whatsappResponsavel.replace(/\D/g, ""))
          .maybeSingle();

        if (responsavel) {
          // Vincular responsável existente
          await supabase.from("kids_responsaveis").insert({
            crianca_novo_convertido_id: novoConvertido.id,
            responsavel_member_id: responsavel.id,
            parentesco: "responsavel",
            principal: true,
            notificar_ausencia: true,
          });
        }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Criança
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Criança Visitante</DialogTitle>
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
              <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={(e) => setFormData((prev) => ({ ...prev, dataNascimento: e.target.value }))}
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
            <h4 className="font-medium mb-3">Endereço</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {loadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData((prev) => ({ ...prev, numero: e.target.value }))}
                  placeholder="Nº"
                />
              </div>
            </div>

            <div className="space-y-2 mt-3">
              <Label htmlFor="address">Rua</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Logradouro"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData((prev) => ({ ...prev, neighborhood: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Responsável</h4>
            
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
