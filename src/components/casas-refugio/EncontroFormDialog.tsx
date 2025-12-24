import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import { Loader2, Users, Package, DollarSign, Calendar } from "lucide-react";

const formSchema = z.object({
  data_encontro: z.string().min(1, "Data é obrigatória"),
  qtd_lideres: z.coerce.number().min(0, "Valor inválido"),
  qtd_membros: z.coerce.number().min(0, "Valor inválido"),
  qtd_criancas: z.coerce.number().min(0, "Valor inválido"),
  qtd_visitantes: z.coerce.number().min(0, "Valor inválido"),
  kilos_arrecadados: z.coerce.number().min(0, "Valor inválido"),
  ofertas: z.coerce.number().min(0, "Valor inválido"),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CasaRefugio {
  id: string;
  name: string;
  anfitrioes: string | null;
  condominio: string | null;
  lideres: string | null;
  supervisores: string | null;
  dias: string | null;
  frequencia: string | null;
  cep: string | null;
  address: string | null;
  numero: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

interface EncontroFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casa: CasaRefugio | null;
}

export const EncontroFormDialog = ({
  open,
  onOpenChange,
  casa,
}: EncontroFormDialogProps) => {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data_encontro: new Date().toISOString().split("T")[0],
      qtd_lideres: 0,
      qtd_membros: 0,
      qtd_criancas: 0,
      qtd_visitantes: 0,
      kilos_arrecadados: 0,
      ofertas: 0,
      observacoes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        data_encontro: new Date().toISOString().split("T")[0],
        qtd_lideres: 0,
        qtd_membros: 0,
        qtd_criancas: 0,
        qtd_visitantes: 0,
        kilos_arrecadados: 0,
        ofertas: 0,
        observacoes: "",
      });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!casa) throw new Error("Casa não selecionada");

      const { error } = await supabase.from("encontros_casa_refugio").insert({
        casa_refugio_id: casa.id,
        data_encontro: data.data_encontro,
        qtd_lideres: data.qtd_lideres,
        qtd_membros: data.qtd_membros,
        qtd_criancas: data.qtd_criancas,
        qtd_visitantes: data.qtd_visitantes,
        kilos_arrecadados: data.kilos_arrecadados,
        ofertas: data.ofertas,
        observacoes: data.observacoes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encontros"] });
      toast({
        title: "Encontro registrado!",
        description: "O relatório foi salvo com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalPessoas =
    (form.watch("qtd_lideres") || 0) +
    (form.watch("qtd_membros") || 0) +
    (form.watch("qtd_criancas") || 0) +
    (form.watch("qtd_visitantes") || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-destructive" />
            Registrar Encontro
          </DialogTitle>
          {casa && (
            <p className="text-sm text-muted-foreground">
              {casa.name} • {casa.condominio}
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
            className="space-y-4"
          >
            {/* Data */}
            <FormField
              control={form.control}
              name="data_encontro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Data do Encontro
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Participantes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participantes
                </span>
                <span className="text-sm text-muted-foreground">
                  Total: <strong className="text-foreground">{totalPessoas}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="qtd_lideres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Líderes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qtd_membros"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Membros</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qtd_criancas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Crianças</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qtd_visitantes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Visitantes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Arrecadação */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kilos_arrecadados"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Kilos Arrecadados
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ofertas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Ofertas (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Alguma observação sobre o encontro..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-destructive hover:bg-destructive/90"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
