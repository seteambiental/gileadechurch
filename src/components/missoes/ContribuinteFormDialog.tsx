import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  member_id: z.string().optional(),
  nome_manual: z.string().optional(),
  valor_mensal: z.string().min(1, "Valor é obrigatório"),
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
      ativo: true,
      data_inicio: new Date().toISOString().split("T")[0],
      observacoes: "",
    },
  });

  useEffect(() => {
    if (open && contribuinte) {
      form.reset({
        member_id: contribuinte.member_id || "",
        nome_manual: contribuinte.nome_manual || "",
        valor_mensal: String(contribuinte.valor_mensal),
        ativo: contribuinte.ativo,
        data_inicio: contribuinte.data_inicio,
        observacoes: contribuinte.observacoes || "",
      });
    } else if (open) {
      form.reset({
        member_id: "",
        nome_manual: "",
        valor_mensal: "",
        ativo: true,
        data_inicio: new Date().toISOString().split("T")[0],
        observacoes: "",
      });
    }
  }, [open, contribuinte, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        member_id: data.member_id || null,
        nome_manual: data.nome_manual || null,
        valor_mensal: parseFloat(data.valor_mensal),
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
                  <Select 
                    onValueChange={(val) => field.onChange(val === "none" ? "" : val)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um membro (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (informar nome manual)</SelectItem>
                      {members?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              name="data_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
