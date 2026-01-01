import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatPhone, formatCep, formatCNPJ } from "@/lib/masks";

interface InstituicaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instituicao?: any;
}

const tiposInstituicao = [
  { value: "idosos", label: "Idosos" },
  { value: "criancas", label: "Crianças" },
  { value: "comunidade_terapeutica", label: "Comunidade Terapêutica" },
  { value: "abrigo", label: "Abrigo" },
  { value: "ong", label: "ONG" },
  { value: "outros", label: "Outros" },
];

const tiposAjuda = [
  "Cesta básica",
  "Alimentos in natura",
  "Produtos de higiene",
  "Roupas",
  "Fraldas geriátricas",
  "Fraldas infantis",
  "Medicamentos",
  "Auxílio financeiro",
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

export function InstituicaoFormDialog({ open, onOpenChange, instituicao }: InstituicaoFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!instituicao;

  const form = useForm({
    defaultValues: {
      nome: "",
      cnpj: "",
      tipo_instituicao: "",
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
      responsavel_nome: "",
      responsavel_telefone: "",
      tipo_ajuda: "",
      frequencia_ajuda: "",
      quantidade_atendidos: "",
      observacoes: "",
      ativo: true,
    },
  });

  useEffect(() => {
    if (instituicao) {
      form.reset({
        nome: instituicao.nome || "",
        cnpj: instituicao.cnpj || "",
        tipo_instituicao: instituicao.tipo_instituicao || "",
        endereco: instituicao.endereco || "",
        numero: instituicao.numero || "",
        complemento: instituicao.complemento || "",
        bairro: instituicao.bairro || "",
        cidade: instituicao.cidade || "",
        estado: instituicao.estado || "",
        cep: instituicao.cep || "",
        telefone: instituicao.telefone || "",
        whatsapp: instituicao.whatsapp || "",
        email: instituicao.email || "",
        responsavel_nome: instituicao.responsavel_nome || "",
        responsavel_telefone: instituicao.responsavel_telefone || "",
        tipo_ajuda: instituicao.tipo_ajuda || "",
        frequencia_ajuda: instituicao.frequencia_ajuda || "",
        quantidade_atendidos: instituicao.quantidade_atendidos?.toString() || "",
        observacoes: instituicao.observacoes || "",
        ativo: instituicao.ativo ?? true,
      });
    } else {
      form.reset({
        nome: "",
        cnpj: "",
        tipo_instituicao: "",
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
        responsavel_nome: "",
        responsavel_telefone: "",
        tipo_ajuda: "",
        frequencia_ajuda: "",
        quantidade_atendidos: "",
        observacoes: "",
        ativo: true,
      });
    }
  }, [instituicao, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        quantidade_atendidos: values.quantidade_atendidos
          ? parseInt(values.quantidade_atendidos)
          : 0,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("acao_social_instituicoes")
          .update(payload)
          .eq("id", instituicao.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("acao_social_instituicoes")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_instituicoes"] });
      toast.success(isEditing ? "Instituição atualizada" : "Instituição cadastrada");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar instituição");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Instituição" : "Nova Instituição"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Instituição *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00.000.000/0000-00"
                        onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_instituicao"
                rules={{ required: "Tipo é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Instituição *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposInstituicao.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="responsavel_nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Responsável</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel_telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone do Responsável</FormLabel>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone da Instituição</FormLabel>
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
                    <Input {...field} type="email" />
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
                        <Input {...field} />
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
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={2} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <FormLabel>Frequência</FormLabel>
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
              <FormField
                control={form.control}
                name="quantidade_atendidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd. Atendidos</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" />
                    </FormControl>
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
                    <FormLabel>Instituição ativa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Define se a instituição está recebendo ajuda atualmente
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
