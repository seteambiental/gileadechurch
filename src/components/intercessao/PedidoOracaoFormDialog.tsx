import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Send } from "lucide-react";

const formSchema = z.object({
  nome: z.string().optional(),
  pedido: z.string().min(1, "O pedido de oração é obrigatório"),
  anonimo: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface PedidoOracaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PedidoOracaoFormDialog = ({ open, onOpenChange }: PedidoOracaoFormDialogProps) => {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      pedido: "",
      anonimo: false,
    },
  });

  const isAnonymous = form.watch("anonimo");

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from("pedidos_oracao").insert({
        nome: values.anonimo ? null : values.nome || null,
        pedido: values.pedido,
        anonimo: values.anonimo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido de oração enviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pedidos-oracao"] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao enviar pedido de oração");
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Oração</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="anonimo"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Enviar de forma anônima</FormLabel>
                </FormItem>
              )}
            />

            {!isAnonymous && (
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu nome (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="pedido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pedido de Oração *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Compartilhe seu pedido de oração..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              Sua privacidade é respeitada. Os pedidos são tratados com confidencialidade.
            </p>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Enviando..." : "Enviar Pedido"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PedidoOracaoFormDialog;
