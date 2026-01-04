import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TarefaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa?: {
    id: string;
    titulo: string;
    descricao: string | null;
    data_tarefa: string;
    hora_inicio: string | null;
    hora_fim: string | null;
    local: string | null;
    vagas_necessarias: number;
    status: string;
  } | null;
}

export function TarefaFormDialog({ open, onOpenChange, tarefa }: TarefaFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!tarefa;

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data_tarefa: "",
    hora_inicio: "",
    hora_fim: "",
    local: "",
    vagas_necessarias: 1,
    status: "aberta",
  });

  useEffect(() => {
    if (tarefa) {
      setFormData({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || "",
        data_tarefa: tarefa.data_tarefa,
        hora_inicio: tarefa.hora_inicio || "",
        hora_fim: tarefa.hora_fim || "",
        local: tarefa.local || "",
        vagas_necessarias: tarefa.vagas_necessarias,
        status: tarefa.status,
      });
    } else {
      setFormData({
        titulo: "",
        descricao: "",
        data_tarefa: "",
        hora_inicio: "",
        hora_fim: "",
        local: "",
        vagas_necessarias: 1,
        status: "aberta",
      });
    }
  }, [tarefa, open]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        titulo: data.titulo.trim(),
        descricao: data.descricao.trim() || null,
        data_tarefa: data.data_tarefa,
        hora_inicio: data.hora_inicio || null,
        hora_fim: data.hora_fim || null,
        local: data.local.trim() || null,
        vagas_necessarias: data.vagas_necessarias,
        status: data.status,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("servico_tarefas")
          .update(payload)
          .eq("id", tarefa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("servico_tarefas")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servico-tarefas"] });
      toast.success(isEditing ? "Tarefa atualizada!" : "Tarefa criada!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar tarefa");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!formData.data_tarefa) {
      toast.error("Data é obrigatória");
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
              placeholder="Ex: Organização do Café"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_tarefa">Data *</Label>
              <Input
                id="data_tarefa"
                type="date"
                value={formData.data_tarefa}
                onChange={(e) => setFormData((prev) => ({ ...prev, data_tarefa: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vagas">Vagas Necessárias</Label>
              <Input
                id="vagas"
                type="number"
                min={1}
                value={formData.vagas_necessarias}
                onChange={(e) => setFormData((prev) => ({ ...prev, vagas_necessarias: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora Início</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData((prev) => ({ ...prev, hora_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fim">Hora Fim</Label>
              <Input
                id="hora_fim"
                type="time"
                value={formData.hora_fim}
                onChange={(e) => setFormData((prev) => ({ ...prev, hora_fim: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input
              id="local"
              value={formData.local}
              onChange={(e) => setFormData((prev) => ({ ...prev, local: e.target.value }))}
              placeholder="Ex: Cozinha da Igreja"
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar" : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
