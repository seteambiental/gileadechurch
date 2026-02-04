import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatNameField } from "@/lib/text-utils";
import { ClearableSelect } from "@/components/ui/clearable-select";

interface Frente {
  id: string;
  nome: string;
  descricao: string | null;
  lider_id: string | null;
  ativo: boolean;
}

interface FrenteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frente: Frente | null;
}

interface FormData {
  nome: string;
  descricao: string;
  lider_id: string;
  ativo: boolean;
}

export function FrenteFormDialog({ open, onOpenChange, frente }: FrenteFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      nome: "",
      descricao: "",
      lider_id: "",
      ativo: true,
    },
  });

  const { data: members } = useQuery({
    queryKey: ["members-for-lider"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (frente) {
      form.reset({
        nome: frente.nome,
        descricao: frente.descricao || "",
        lider_id: frente.lider_id || "",
        ativo: frente.ativo,
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        lider_id: "",
        ativo: true,
      });
    }
  }, [frente, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        nome: formatNameField(data.nome),
        descricao: data.descricao || null,
        lider_id: data.lider_id || null,
        ativo: data.ativo,
      };

      if (frente) {
        const { error } = await supabase
          .from("evangelizacao_frentes")
          .update(payload)
          .eq("id", frente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("evangelizacao_frentes")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evangelizacao-frentes"] });
      toast.success(frente ? "Frente atualizada!" : "Frente criada!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar frente");
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
            {frente ? "Editar Frente" : "Nova Frente de Trabalho"}
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
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Evangelização de Rua" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a frente de trabalho..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lider_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Líder</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value || null}
                      onChange={(val) => field.onChange(val || "")}
                      options={(members?.filter((m) => !!m?.id) || []).map((m) => ({
                        value: m.id,
                        label: m.full_name,
                      }))}
                      placeholder="Selecione um líder"
                      emptyLabel="Nenhum"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Frentes inativas não aparecem nas escalas
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {frente ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
