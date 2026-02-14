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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatNameField } from "@/lib/text-utils";

const formSchema = z.object({
  member_id: z.string().optional(),
  nome: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  genero: z.string().optional(),
  observacoes: z.string().optional(),
  is_manual: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface ImpactoInscricaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
}

const ImpactoInscricaoFormDialog = ({ open, onOpenChange, eventoId }: ImpactoInscricaoFormDialogProps) => {
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, email, genero, casa_refugio_id")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas-refugio-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      member_id: "",
      nome: "",
      telefone: "",
      email: "",
      genero: "",
      observacoes: "",
      is_manual: false,
    },
  });

  const isManual = form.watch("is_manual");
  const selectedMemberId = form.watch("member_id");

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let nome = values.nome;
      let telefone = values.telefone;
      let email = values.email;
      let genero = values.genero;

      if (!values.is_manual && values.member_id) {
        const member = members?.find((m) => m.id === values.member_id);
        if (member) {
          nome = member.full_name;
          telefone = member.whatsapp || values.telefone;
          email = member.email || values.email;
          genero = member.genero || values.genero;
        }
      } else if (values.is_manual && nome) {
        nome = formatNameField(nome);
      }

      if (!nome) {
        throw new Error("Nome é obrigatório");
      }

      const { error } = await supabase.from("impacto_inscricoes").insert({
        evento_id: eventoId,
        member_id: values.is_manual ? null : values.member_id || null,
        nome,
        telefone: telefone || null,
        email: email || null,
        genero: genero || null,
        observacoes: values.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição realizada!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", eventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao realizar inscrição");
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!values.is_manual && !values.member_id) {
      toast.error("Selecione um membro ou marque para adicionar manualmente");
      return;
    }
    if (values.is_manual && !values.nome) {
      toast.error("Digite o nome do participante");
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Inscrição</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="is_manual"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Adicionar manualmente (não é membro)</FormLabel>
                </FormItem>
              )}
            />

            {isManual ? (
              <>
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="genero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Não informado</SelectItem>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="member_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membro *</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o membro" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Selecione...</SelectItem>
                          {members?.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {(() => {
                  const selectedMember = members?.find((m) => m.id === selectedMemberId);
                  const casaRefugio = selectedMember?.casa_refugio_id
                    ? casasRefugio.find((c) => c.id === selectedMember.casa_refugio_id)
                    : null;
                  return casaRefugio ? (
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">Casa Refúgio</p>
                      <p className="text-sm font-medium">{casaRefugio.name}</p>
                    </div>
                  ) : null;
                })()}
              </>
            )}

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Realizar Inscrição"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactoInscricaoFormDialog;
