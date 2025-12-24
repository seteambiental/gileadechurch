import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  anfitrioes: z.string().optional(),
  condominio: z.string().optional(),
  lideres: z.string().optional(),
  supervisores: z.string().optional(),
  dias: z.string().optional(),
  frequencia: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  numero: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
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

interface CasaRefugioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CasaRefugio | null;
}

const CasaRefugioFormDialog = ({ open, onOpenChange, item }: CasaRefugioFormDialogProps) => {
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      anfitrioes: "",
      condominio: "",
      lideres: "",
      supervisores: "",
      dias: "",
      frequencia: "",
      cep: "",
      address: "",
      numero: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          anfitrioes: item.anfitrioes || "",
          condominio: item.condominio || "",
          lideres: item.lideres || "",
          supervisores: item.supervisores || "",
          dias: item.dias || "",
          frequencia: item.frequencia || "",
          cep: item.cep || "",
          address: item.address || "",
          numero: item.numero || "",
          neighborhood: item.neighborhood || "",
          city: item.city || "",
          state: item.state || "",
        });
      } else {
        form.reset({
          name: "",
          anfitrioes: "",
          condominio: "",
          lideres: "",
          supervisores: "",
          dias: "",
          frequencia: "",
          cep: "",
          address: "",
          numero: "",
          neighborhood: "",
          city: "",
          state: "",
        });
      }
    }
  }, [item, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        name: data.name,
        anfitrioes: data.anfitrioes || null,
        condominio: data.condominio || null,
        lideres: data.lideres || null,
        supervisores: data.supervisores || null,
        dias: data.dias || null,
        frequencia: data.frequencia || null,
        cep: data.cep || null,
        address: data.address || null,
        numero: data.numero || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
      };

      if (item) {
        const { error } = await supabase
          .from("casas_refugio")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("casas_refugio").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casas_refugio"] });
      toast({ title: item ? "Casa Refúgio atualizada!" : "Casa Refúgio cadastrada!" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar Casa Refúgio", variant: "destructive" });
    },
  });

  const handleCepBlur = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    if (cep?.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("address", data.logradouro || "");
        form.setValue("neighborhood", data.bairro || "");
        form.setValue("city", data.localidade || "");
        form.setValue("state", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Casa Refúgio" : "Nova Casa Refúgio"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              {/* 1. Casa Refúgio (Nome) */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Casa Refúgio *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome da Casa Refúgio" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 2. Anfitriões */}
              <FormField
                control={form.control}
                name="anfitrioes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anfitriões</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome dos anfitriões" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 3. Condomínio */}
              <FormField
                control={form.control}
                name="condominio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condomínio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do condomínio" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 4. Líderes */}
              <FormField
                control={form.control}
                name="lideres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Líderes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome dos líderes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 5. Supervisores */}
              <FormField
                control={form.control}
                name="supervisores"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisores</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome dos supervisores" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 6. Dias da Casa Refúgio */}
              <FormField
                control={form.control}
                name="dias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias da Casa Refúgio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Quinta-feira" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 7. Frequência */}
              <FormField
                control={form.control}
                name="frequencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Semanal, Quinzenal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t border-border pt-4 mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-4">Endereço</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* 8. CEP */}
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="00000-000"
                              onBlur={handleCepBlur}
                            />
                            {isLoadingCep && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 9. Endereço */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Rua, Avenida..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 10. Número */}
                  <FormField
                    control={form.control}
                    name="numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nº" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 11. Bairro */}
                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 12. Cidade */}
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* 13. UF */}
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} placeholder="PR" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {item ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CasaRefugioFormDialog;
