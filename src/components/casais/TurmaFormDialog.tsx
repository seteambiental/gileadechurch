import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateInput } from "@/components/ui/date-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DIAS_SEMANA = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

// Format time input as HH:MM
const formatTimeInput = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
};

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
        dia_semana: turma.dia_semana || "",
        horario_inicio: turma.horario_inicio || "",
        horario_fim: turma.horario_fim || "",
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
        dia_semana: "",
        horario_inicio: "",
        horario_fim: "",
        local: "",
        vagas: 20,
        ativo: true,
      });
    }
  }, [turma, reset]);

  const onSubmit = async (data: any) => {
    // Build horario string for display
    const horarioDisplay = [
      DIAS_SEMANA.find(d => d.value === data.dia_semana)?.label,
      data.horario_inicio && data.horario_fim ? `${data.horario_inicio} - ${data.horario_fim}` : data.horario_inicio,
    ].filter(Boolean).join(" ");

    const payload = {
      nome: data.nome,
      descricao: data.descricao || null,
      data_inicio: data.data_inicio || null,
      data_fim: data.data_fim || null,
      dia_semana: data.dia_semana || null,
      horario_inicio: data.horario_inicio || null,
      horario_fim: data.horario_fim || null,
      horario: horarioDisplay || null,
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
              <Label>Data Início</Label>
              <DateInput
                value={watch("data_inicio") || ""}
                onChange={(v) => setValue("data_inicio", v)}
                maxDate={undefined}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <DateInput
                value={watch("data_fim") || ""}
                onChange={(v) => setValue("data_fim", v)}
                maxDate={undefined}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dia da Semana</Label>
            <Select value={watch("dia_semana") || ""} onValueChange={(v) => setValue("dia_semana", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
              <SelectContent>
                {DIAS_SEMANA.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário De (HH:MM)</Label>
              <Input
                value={watch("horario_inicio") || ""}
                onChange={(e) => setValue("horario_inicio", formatTimeInput(e.target.value))}
                placeholder="19:00"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label>Horário Até (HH:MM)</Label>
              <Input
                value={watch("horario_fim") || ""}
                onChange={(e) => setValue("horario_fim", formatTimeInput(e.target.value))}
                placeholder="21:00"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input id="local" {...register("local")} placeholder="Local das aulas" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vagas">Vagas</Label>
              <Input id="vagas" type="number" {...register("vagas")} />
            </div>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{turma ? "Salvar" : "Criar Turma"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
