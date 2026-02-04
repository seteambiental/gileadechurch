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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ClearableSelect } from "@/components/ui/clearable-select";

const DEPARTAMENTOS = [
  { value: "logistica", label: "Logística" },
  { value: "correio", label: "Correio" },
  { value: "ministradores", label: "Ministradores" },
  { value: "apoio", label: "Apoio" },
  { value: "teatro", label: "Teatro" },
  { value: "cozinha", label: "Cozinha" },
  { value: "financeiro", label: "Financeiro" },
];

const formSchema = z.object({
  nome: z.string().min(1, "Departamento é obrigatório"),
  lider_id: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ImpactoDepartamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
}

const ImpactoDepartamentoFormDialog = ({ open, onOpenChange, eventoId }: ImpactoDepartamentoFormDialogProps) => {
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      lider_id: "",
      observacoes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from("impacto_departamentos").insert({
        evento_id: eventoId,
        nome: values.nome,
        lider_id: values.lider_id || null,
        observacoes: values.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Departamento adicionado!");
      queryClient.invalidateQueries({ queryKey: ["impacto-departamentos", eventoId] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao adicionar departamento");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Departamento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEPARTAMENTOS.map((dept) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
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
              name="lider_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Líder</FormLabel>
                  <FormControl>
                    <ClearableSelect
                      value={field.value || null}
                      onChange={(val) => field.onChange(val || "")}
                      options={(members || []).map((m) => ({
                        value: m.id,
                        label: m.full_name,
                      }))}
                      placeholder="Selecione o líder"
                      emptyLabel="Nenhum"
                    />
                  </FormControl>
                  <FormMessage />
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

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactoDepartamentoFormDialog;
