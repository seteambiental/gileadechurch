import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: any;
  turmas: { id: string; nome: string }[];
}

export function MaterialFormDialog({ open, onOpenChange, material, turmas }: MaterialFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const turmaId = watch("turma_id");
  const tipo = watch("tipo");

  useEffect(() => {
    if (material) {
      reset({
        titulo: material.titulo,
        descricao: material.descricao,
        tipo: material.tipo,
        url: material.url,
        turma_id: material.turma_id || "",
        ordem: material.ordem,
      });
    } else {
      reset({
        titulo: "",
        descricao: "",
        tipo: "documento",
        url: "",
        turma_id: "",
        ordem: 1,
      });
    }
  }, [material, reset]);

  const onSubmit = async (data: any) => {
    const payload = {
      titulo: data.titulo,
      descricao: data.descricao || null,
      tipo: data.tipo,
      url: data.url || null,
      turma_id: data.turma_id || null,
      ordem: parseInt(data.ordem) || 1,
    };

    let error;
    if (material) {
      ({ error } = await supabase.from("casais_materiais").update(payload).eq("id", material.id));
    } else {
      ({ error } = await supabase.from("casais_materiais").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar material", variant: "destructive" });
    } else {
      toast({ title: material ? "Material atualizado" : "Material criado" });
      queryClient.invalidateQueries({ queryKey: ["casais_materiais"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{material ? "Editar Material" : "Novo Material"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do material e clique em {material ? "Salvar" : "Criar"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input id="titulo" {...register("titulo", { required: true })} placeholder="Título do material" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} placeholder="Descrição do material..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setValue("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documento">Documento</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={turmaId || "geral"} onValueChange={(v) => setValue("turma_id", v === "geral" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Geral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral (todas turmas)</SelectItem>
                  {turmas.filter((t) => !!t?.id).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...register("url")} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem</Label>
            <Input id="ordem" type="number" {...register("ordem")} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {material ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
