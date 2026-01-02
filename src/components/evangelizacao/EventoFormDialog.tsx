import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Evento {
  id: string;
  frente_id: string;
  nome: string;
  data_evento: string;
  local: string | null;
  descricao: string | null;
  vidas_alcancadas: number;
  decisoes: number;
  observacoes: string | null;
}

interface EventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frenteId: string;
  evento: Evento | null;
}

interface FormData {
  nome: string;
  data_evento: string;
  local: string;
  descricao: string;
  vidas_alcancadas: number;
  decisoes: number;
  observacoes: string;
}

export function EventoFormDialog({ open, onOpenChange, frenteId, evento }: EventoFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      nome: "",
      data_evento: new Date().toISOString().split("T")[0],
      local: "",
      descricao: "",
      vidas_alcancadas: 0,
      decisoes: 0,
      observacoes: "",
    },
  });

  useEffect(() => {
    if (evento) {
      form.reset({
        nome: evento.nome,
        data_evento: evento.data_evento,
        local: evento.local || "",
        descricao: evento.descricao || "",
        vidas_alcancadas: evento.vidas_alcancadas,
        decisoes: evento.decisoes,
        observacoes: evento.observacoes || "",
      });
    } else {
      form.reset({
        nome: "",
        data_evento: new Date().toISOString().split("T")[0],
        local: "",
        descricao: "",
        vidas_alcancadas: 0,
        decisoes: 0,
        observacoes: "",
      });
    }
  }, [evento, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        frente_id: frenteId,
        nome: data.nome,
        data_evento: data.data_evento,
        local: data.local || null,
        descricao: data.descricao || null,
        vidas_alcancadas: data.vidas_alcancadas || 0,
        decisoes: data.decisoes || 0,
        observacoes: data.observacoes || null,
      };

      if (evento) {
        const { error } = await supabase
          .from("evangelizacao_eventos")
          .update(payload)
          .eq("id", evento.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("evangelizacao_eventos")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-eventos"] });
      toast.success(evento ? "Evento atualizado!" : "Evento cadastrado!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar evento");
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {evento ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Evento</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Evangelismo na Praça" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_evento"
                rules={{ required: "Data é obrigatória" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="local"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <Input placeholder="Local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o evento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vidas_alcancadas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vidas Alcançadas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="decisoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decisões</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {evento ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
