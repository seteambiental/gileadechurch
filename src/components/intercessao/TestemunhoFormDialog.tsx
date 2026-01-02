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
import { Heart } from "lucide-react";

const formSchema = z.object({
  nome: z.string().optional(),
  testemunho: z.string().min(1, "O testemunho é obrigatório").max(300, "Máximo de 300 caracteres"),
  foto_url: z.string().optional(),
  anonimo: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface TestemunhoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TestemunhoFormDialog = ({ open, onOpenChange }: TestemunhoFormDialogProps) => {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      testemunho: "",
      foto_url: "",
      anonimo: false,
    },
  });

  const isAnonymous = form.watch("anonimo");
  const testemunhoValue = form.watch("testemunho");

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from("testemunhos").insert({
        nome: values.anonimo ? null : values.nome || null,
        testemunho: values.testemunho,
        foto_url: values.anonimo ? null : values.foto_url || null,
        anonimo: values.anonimo,
        aprovado: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Testemunho enviado! Aguarde aprovação para publicação.");
      queryClient.invalidateQueries({ queryKey: ["testemunhos"] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao enviar testemunho");
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Testemunho</DialogTitle>
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
              <>
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

                <FormField
                  control={form.control}
                  name="foto_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Foto (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="testemunho"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu Testemunho *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Compartilhe o que Deus fez em sua vida..."
                      className="min-h-[120px] resize-none"
                      maxLength={300}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <FormMessage />
                    <span>{testemunhoValue?.length || 0}/300</span>
                  </div>
                </FormItem>
              )}
            />

            <p className="text-xs text-muted-foreground">
              Seu testemunho será publicado após aprovação da equipe.
            </p>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              <Heart className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Enviando..." : "Enviar Testemunho"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TestemunhoFormDialog;
