import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface TurmaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma?: any;
}

export function TurmaFormDialog({ open, onOpenChange, turma }: TurmaFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const ativo = watch("ativo", true);

  useEffect(() => {
    if (turma) {
      reset({
        nome: turma.nome,
        descricao: turma.descricao,
        data_inicio: turma.data_inicio,
        data_fim: turma.data_fim,
        horario: turma.horario,
        local: turma.local,
        vagas: turma.vagas,
        ativo: turma.ativo,
      });
    } else {
      reset({
        nome: "",
        descricao: "",
        data_inicio: "",
        data_fim: "",
        horario: "",
        local: "",
        vagas: 20,
        ativo: true,
      });
    }
  }, [turma, reset]);

  const onSubmit = async (data: any) => {
    const payload = {
      nome: data.nome,
      descricao: data.descricao || null,
      data_inicio: data.data_inicio || null,
      data_fim: data.data_fim || null,
      horario: data.horario || null,
      local: data.local || null,
      vagas: parseInt(data.vagas) || 20,
      ativo: data.ativo,
    };

    let error;
    if (turma) {
      ({ error } = await supabase.from("casais_turmas").update(payload).eq("id", turma.id));
    } else {
      ({ error } = await supabase.from("casais_turmas").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar turma", variant: "destructive" });
    } else {
      toast({ title: turma ? "Turma atualizada" : "Turma criada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_turmas"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{turma ? "Editar Turma" : "Nova Turma"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Turma *</Label>
            <Input id="nome" {...register("nome", { required: true })} placeholder="Ex: Turma 2026.1" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} placeholder="Descrição do curso..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data Início</Label>
              <Input id="data_inicio" type="date" {...register("data_inicio")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data Fim</Label>
              <Input id="data_fim" type="date" {...register("data_fim")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horario">Horário</Label>
              <Input id="horario" {...register("horario")} placeholder="Ex: Sábados 19h" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vagas">Vagas</Label>
              <Input id="vagas" type="number" {...register("vagas")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local</Label>
            <Input id="local" {...register("local")} placeholder="Local das aulas" />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Turma Ativa</Label>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={(checked) => setValue("ativo", checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {turma ? "Salvar" : "Criar Turma"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
