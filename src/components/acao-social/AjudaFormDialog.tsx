import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";

interface AjudaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tiposAjuda = [
  "Cesta básica",
  "Alimentos",
  "Auxílio financeiro",
  "Roupas",
  "Medicamentos",
  "Material escolar",
  "Fraldas",
  "Produtos de higiene",
  "Móveis",
  "Outros",
];

export function AjudaFormDialog({ open, onOpenChange }: AjudaFormDialogProps) {
  const [tipoBeneficiario, setTipoBeneficiario] = useState<"familia" | "instituicao">("familia");
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      beneficiario_id: "",
      data_ajuda: new Date().toISOString().split("T")[0],
      tipo_ajuda: "",
      valor: "",
      quantidade_kilos: "",
      quantidade_cestas: "",
      quantidade_itens: "",
      descricao: "",
      observacoes: "",
    },
  });

  const { data: familias } = useQuery({
    queryKey: ["familias_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_familias")
        .select("id, nome_familia")
        .eq("ativo", true)
        .order("nome_familia");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: instituicoes } = useQuery({
    queryKey: ["instituicoes_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("acao_social_instituicoes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        beneficiario_id: "",
        data_ajuda: new Date().toISOString().split("T")[0],
        tipo_ajuda: "",
        valor: "",
        quantidade_kilos: "",
        quantidade_cestas: "",
        quantidade_itens: "",
        descricao: "",
        observacoes: "",
      });
      setTipoBeneficiario("familia");
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        familia_id: tipoBeneficiario === "familia" ? values.beneficiario_id : null,
        instituicao_id: tipoBeneficiario === "instituicao" ? values.beneficiario_id : null,
        data_ajuda: values.data_ajuda,
        tipo_ajuda: values.tipo_ajuda,
        valor: values.valor ? parseFloat(values.valor) : null,
        quantidade_kilos: values.quantidade_kilos ? parseFloat(values.quantidade_kilos) : null,
        quantidade_cestas: values.quantidade_cestas ? parseInt(values.quantidade_cestas) : null,
        quantidade_itens: values.quantidade_itens ? parseInt(values.quantidade_itens) : null,
        descricao: values.descricao || null,
        observacoes: values.observacoes || null,
      };

      const { error } = await supabase.from("acao_social_ajudas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["acao_social_ajudas"] });
      toast.success("Ajuda registrada com sucesso");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao registrar ajuda");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  const beneficiarios = tipoBeneficiario === "familia" ? familias : instituicoes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Ajuda</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Beneficiário</Label>
              <RadioGroup
                value={tipoBeneficiario}
                onValueChange={(v) => {
                  setTipoBeneficiario(v as "familia" | "instituicao");
                  form.setValue("beneficiario_id", "");
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="familia" id="familia" />
                  <Label htmlFor="familia" className="cursor-pointer">
                    Família
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="instituicao" id="instituicao" />
                  <Label htmlFor="instituicao" className="cursor-pointer">
                    Instituição
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <FormField
              control={form.control}
              name="beneficiario_id"
              rules={{ required: "Selecione um beneficiário" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {tipoBeneficiario === "familia" ? "Família" : "Instituição"} *
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beneficiarios?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {"nome_familia" in b ? b.nome_familia : b.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_ajuda"
                rules={{ required: "Data é obrigatória" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <DateInput 
                        value={field.value} 
                        onChange={field.onChange}
                        maxDate={undefined}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_ajuda"
                rules={{ required: "Tipo é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ajuda *</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0,00" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantidade_kilos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade (kg)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.1" min="0" placeholder="0" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantidade_cestas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd. Cestas</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="0" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantidade_itens"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qtd. Itens</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="0" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição dos Itens</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Descreva os itens entregues..." />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Registrar Ajuda"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
