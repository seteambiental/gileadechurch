import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCep, unformatPhone, unformatCep, formatCPF } from "@/lib/masks";
import { useCepLookup } from "@/hooks/useCepLookup";

const formSchema = z.object({
  full_name: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  whatsapp: z.string().min(10, "WhatsApp é obrigatório"),
  genero: z.string().optional(),
  birth_date: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  cpf: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MemberRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MemberRequestForm = ({ open, onOpenChange }: MemberRequestFormProps) => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      whatsapp: "",
      genero: "",
      birth_date: "",
      cep: "",
      address: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      cpf: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const cpfClean = data.cpf ? data.cpf.replace(/\D/g, "") : null;
      
      // Verificar se já existe um membro ou solicitação com o mesmo nome e CPF
      if (cpfClean) {
        // Verificar na tabela de membros
        const { data: existingMember } = await supabase
          .from("members")
          .select("id")
          .eq("cpf", cpfClean)
          .maybeSingle();
        
        if (existingMember) {
          throw new Error("USUÁRIO JÁ CADASTRADO");
        }
        
        // Verificar na tabela de solicitações pendentes
        const { data: existingRequest } = await supabase
          .from("member_requests")
          .select("id")
          .eq("cpf", cpfClean)
          .eq("status", "pendente")
          .maybeSingle();
        
        if (existingRequest) {
          throw new Error("USUÁRIO JÁ CADASTRADO");
        }
      }

      const payload = {
        full_name: data.full_name,
        email: data.email || null,
        whatsapp: data.whatsapp ? unformatPhone(data.whatsapp) : null,
        genero: data.genero || null,
        birth_date: data.birth_date || null,
        cep: data.cep ? unformatCep(data.cep) : null,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        state: data.state || null,
        cpf: cpfClean,
        status: "pendente",
      };

      const { error } = await supabase.from("member_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const { isLoading: isLoadingCep } = useCepLookup(form.watch("cep"), ({ address, neighborhood, city, state }) => {
    form.setValue("address", address || "");
    form.setValue("neighborhood", neighborhood || "");
    form.setValue("city", city || "");
    form.setValue("state", state || "");
  });

  const handleClose = () => {
    setSubmitted(false);
    form.reset();
    onOpenChange(false);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              Solicitação Enviada!
            </h2>
            <p className="text-muted-foreground mb-4">
              Sua solicitação de cadastro foi enviada com sucesso. 
              Um administrador irá analisar e você será notificado em breve.
            </p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Quero fazer parte da Igreja
          </DialogTitle>
          <DialogDescription>
            Preencha seus dados para solicitar seu cadastro como membro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000.000.000-00"
                      {...field}
                      onChange={(e) => field.onChange(formatCPF(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        {...field}
                        onChange={(e) => field.onChange(formatCep(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isLoadingCep ? "Buscando..." : "Rua, Avenida..."}
                        {...field}
                        disabled={isLoadingCep}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} disabled={isLoadingCep} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} disabled={isLoadingCep} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" maxLength={2} {...field} disabled={isLoadingCep} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar Solicitação
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
