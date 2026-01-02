import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  member_id: z.string().optional(),
  nome_manual: z.string().optional(),
  funcao: z.string().optional(),
  is_manual: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface ImpactoMembroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departamentoId: string;
  eventoId: string;
}

const ImpactoMembroFormDialog = ({ open, onOpenChange, departamentoId, eventoId }: ImpactoMembroFormDialogProps) => {
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_id: "",
      nome_manual: "",
      funcao: "",
      is_manual: false,
    },
  });

  const isManual = form.watch("is_manual");

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from("impacto_equipe_membros").insert({
        departamento_id: departamentoId,
        member_id: values.is_manual ? null : values.member_id || null,
        nome_manual: values.is_manual ? values.nome_manual : null,
        funcao: values.funcao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado!");
      queryClient.invalidateQueries({ queryKey: ["impacto-equipe-membros", eventoId] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao adicionar membro");
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!values.is_manual && !values.member_id) {
      toast.error("Selecione um membro ou marque para adicionar manualmente");
      return;
    }
    if (values.is_manual && !values.nome_manual) {
      toast.error("Digite o nome do membro");
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="is_manual"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Adicionar manualmente (não é membro)</FormLabel>
                </FormItem>
              )}
            />

            {isManual ? (
              <FormField
                control={form.control}
                name="nome_manual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membro *</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o membro" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Selecione...</SelectItem>
                        {members?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="funcao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Função</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Coordenador, Auxiliar..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactoMembroFormDialog;
