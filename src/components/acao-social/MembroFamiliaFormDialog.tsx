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
import { DateInput } from "@/components/ui/date-input";

interface MembroFamiliaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familiaId: string;
  membro?: any;
  onSuccess?: () => void;
}

const parentescos = [
  "Pai",
  "Mãe",
  "Filho",
  "Filha",
  "Esposo",
  "Esposa",
  "Irmão",
  "Irmã",
  "Avô",
  "Avó",
  "Neto",
  "Neta",
  "Tio",
  "Tia",
  "Sobrinho",
  "Sobrinha",
  "Primo",
  "Prima",
  "Genro",
  "Nora",
  "Sogro",
  "Sogra",
  "Enteado",
  "Enteada",
  "Outro",
];

const generos = ["Masculino", "Feminino"];

const escolaridades = [
  "Não alfabetizado",
  "Ensino Fundamental Incompleto",
  "Ensino Fundamental Completo",
  "Ensino Médio Incompleto",
  "Ensino Médio Completo",
  "Ensino Superior Incompleto",
  "Ensino Superior Completo",
  "Pós-graduação",
];

export function MembroFamiliaFormDialog({
  open,
  onOpenChange,
  familiaId,
  membro,
  onSuccess,
}: MembroFamiliaFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!membro;

  const form = useForm({
    defaultValues: {
      nome: "",
      data_nascimento: "",
      genero: "",
      parentesco: "",
      profissao: "",
      local_trabalho: "",
      salario: "",
      trabalha: false,
      escolaridade: "",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (membro) {
      form.reset({
        nome: membro.nome || "",
        data_nascimento: membro.data_nascimento || "",
        genero: membro.genero || "",
        parentesco: membro.parentesco || "",
        profissao: membro.profissao || "",
        local_trabalho: membro.local_trabalho || "",
        salario: membro.salario?.toString() || "",
        trabalha: membro.trabalha ?? false,
        escolaridade: membro.escolaridade || "",
        observacoes: membro.observacoes || "",
      });
    } else {
      form.reset({
        nome: "",
        data_nascimento: "",
        genero: "",
        parentesco: "",
        profissao: "",
        local_trabalho: "",
        salario: "",
        trabalha: false,
        escolaridade: "",
        observacoes: "",
      });
    }
  }, [membro, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        familia_id: familiaId,
        salario: values.salario ? parseFloat(values.salario) : 0,
        data_nascimento: values.data_nascimento || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("acao_social_familia_membros")
          .update(payload)
          .eq("id", membro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("acao_social_familia_membros")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familia_membros", familiaId] });
      queryClient.invalidateQueries({ queryKey: ["acao_social_familia_membros_count"] });
      toast.success(isEditing ? "Membro atualizado" : "Membro adicionado");
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar membro");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  const trabalha = form.watch("trabalha");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              rules={{ required: "Nome é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <DateInput 
                        value={field.value} 
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {generos.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parentesco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parentesco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parentescos.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="escolaridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escolaridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {escolaridades.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
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
              name="trabalha"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Trabalha?</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Marque se este membro possui trabalho remunerado
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {trabalha && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="profissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profissão</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Pedreiro" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário (R$)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="local_trabalho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Local de Trabalho</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome da empresa ou local" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

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
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
