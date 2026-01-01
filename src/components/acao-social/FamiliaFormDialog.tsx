import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatPhone, formatCep } from "@/lib/masks";

interface FamiliaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familia?: any;
}

const tiposAjuda = [
  "Cesta básica",
  "Auxílio financeiro",
  "Roupas",
  "Medicamentos",
  "Material escolar",
  "Móveis",
  "Outros",
];

const frequencias = [
  "Semanal",
  "Quinzenal",
  "Mensal",
  "Bimestral",
  "Trimestral",
  "Semestral",
  "Eventual",
];

export function FamiliaFormDialog({ open, onOpenChange, familia }: FamiliaFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!familia;

  const form = useForm({
    defaultValues: {
      nome_familia: "",
      endereco: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      telefone: "",
      whatsapp: "",
      email: "",
      casa_refugio_id: "",
      lider_responsavel_id: "",
      tipo_ajuda: "",
      frequencia_ajuda: "",
      observacoes: "",
      ativo: true,
    },
  });

  const { data: casasRefugio } = useQuery({
    queryKey: ["casas_refugio_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lideres } = useQuery({
    queryKey: ["lideres_select"],
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
    if (familia) {
      form.reset({
        nome_familia: familia.nome_familia || "",
        endereco: familia.endereco || "",
        numero: familia.numero || "",
        complemento: familia.complemento || "",
        bairro: familia.bairro || "",
        cidade: familia.cidade || "",
        estado: familia.estado || "",
        cep: familia.cep || "",
        telefone: familia.telefone || "",
        whatsapp: familia.whatsapp || "",
        email: familia.email || "",
        casa_refugio_id: familia.casa_refugio_id || "",
        lider_responsavel_id: familia.lider_responsavel_id || "",
        tipo_ajuda: familia.tipo_ajuda || "",
        frequencia_ajuda: familia.frequencia_ajuda || "",
        observacoes: familia.observacoes || "",
        ativo: familia.ativo ?? true,
      });
    } else {
      form.reset({
        nome_familia: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
        whatsapp: "",
        email: "",
        casa_refugio_id: "",
        lider_responsavel_id: "",
        tipo_ajuda: "",
        frequencia_ajuda: "",
        observacoes: "",
        ativo: true,
      });
    }
  }, [familia, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        casa_refugio_id: values.casa_refugio_id || null,
        lider_responsavel_id: values.lider_responsavel_id || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("acao_social_familias")
          .update(payload)
          .eq("id", familia.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("acao_social_familias")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_familias"] });
      toast.success(isEditing ? "Família atualizada" : "Família cadastrada");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar família");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Família" : "Nova Família"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_familia"
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Família *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Família Silva" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 0000-0000"
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(00) 00000-0000"
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="email@exemplo.com" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00000-000"
                        onChange={(e) => field.onChange(formatCep(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Rua, Avenida..." />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="casa_refugio_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Casa Refúgio que frequenta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {casasRefugio?.map((casa) => (
                          <SelectItem key={casa.id} value={casa.id}>
                            {casa.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lider_responsavel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Líder Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lideres?.map((lider) => (
                          <SelectItem key={lider.id} value={lider.id}>
                            {lider.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_ajuda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ajuda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposAjuda.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequencia_ajuda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência da Ajuda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencias.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Textarea {...field} rows={3} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Família ativa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Define se a família está recebendo ajuda atualmente
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
