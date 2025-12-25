import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/masks";

interface CriancaVisitanteFormDialogProps {
  children?: React.ReactNode;
}

export function CriancaVisitanteFormDialog({ children }: CriancaVisitanteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

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
          <Button className="bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white shadow-lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar Criança
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">🎈 Cadastrar Criança Visitante</DialogTitle>
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
