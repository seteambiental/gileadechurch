import { useEffect } from "react";
import { todayDateStr } from "@/lib/date-utils";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DateInput } from "@/components/ui/date-input";
import { formatNameField } from "@/lib/text-utils";
import { ClearableSelect } from "@/components/ui/clearable-select";

const formSchema = z.object({
  member_id: z.string().optional(),
  nome_manual: z.string().optional(),
  valor_mensal: z.string().min(1, "Valor é obrigatório"),
  dia_vencimento: z.string().min(1, "Dia de vencimento é obrigatório"),
  ativo: z.boolean(),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Contribuinte {
  id: string;
  member_id: string | null;
  nome_manual: string | null;
  valor_mensal: number;
  dia_vencimento: number | null;
  ativo: boolean;
  data_inicio: string;
  observacoes: string | null;
}

interface ContribuinteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribuinte: Contribuinte | null;
}

export function ContribuinteFormDialog({
  open,
  onOpenChange,
  contribuinte,
}: ContribuinteFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!contribuinte;

  const { data: members } = useQuery({
    queryKey: ["members-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_id: "",
      nome_manual: "",
      valor_mensal: "",
      dia_vencimento: "10",
      ativo: true,
      data_inicio: todayDateStr(),
      observacoes: "",
    },
  });

  useEffect(() => {
    if (open && contribuinte) {
      form.reset({
        member_id: contribuinte.member_id || "",
        nome_manual: contribuinte.nome_manual || "",
        valor_mensal: String(contribuinte.valor_mensal),
        dia_vencimento: String(contribuinte.dia_vencimento || 10),
        ativo: contribuinte.ativo,
        data_inicio: contribuinte.data_inicio,
        observacoes: contribuinte.observacoes || "",
      });
    } else if (open) {
      form.reset({
        member_id: "",
        nome_manual: "",
        valor_mensal: "",
        dia_vencimento: "10",
        ativo: true,
        data_inicio: todayDateStr(),
        observacoes: "",
      });
    }
  }, [open, contribuinte, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        member_id: data.member_id || null,
        nome_manual: data.nome_manual ? formatNameField(data.nome_manual) : null,
        valor_mensal: parseFloat(data.valor_mensal),
        dia_vencimento: parseInt(data.dia_vencimento),
        ativo: data.ativo,
        data_inicio: data.data_inicio,
        observacoes: data.observacoes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("missoes_mocambique_contribuintes")
          .update(payload)
          .eq("id", contribuinte.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("missoes_mocambique_contribuintes")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missoes-contribuintes"] });
      toast.success(isEditing ? "Contribuinte atualizado!" : "Contribuinte cadastrado!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar contribuinte");
    },
  });

  const onSubmit = (data: FormData) => {
    if (!data.member_id && !data.nome_manual) {
      toast.error("Selecione um membro ou informe um nome");
      return;
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Contribuinte" : "Novo Contribuinte"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membro da Igreja</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value || null}
                      onChange={(val) => field.onChange(val || "")}
                      options={(members || []).map((member) => ({
                        value: member.id,
                        label: member.full_name,
                      }))}
                      placeholder="Selecione um membro (opcional)"
                      emptyLabel="Nenhum (informar nome manual)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome_manual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Manual</FormLabel>
                  <FormControl>
                    <Input placeholder="Informe se não for membro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor_mensal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Mensal (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dia_vencimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dia do Compromisso</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="28" placeholder="10" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Dia do mês em que será enviado o lembrete (1 dia antes)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
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
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-base">Ativo</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                    <Textarea placeholder="Observações..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
