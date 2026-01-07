import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, CheckCircle2, Search, AlertCircle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  cpf: z.string().min(14, "CPF é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

interface MemberRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MemberRequestForm = ({ open, onOpenChange }: MemberRequestFormProps) => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [cpfVerified, setCpfVerified] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);

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

  const cpfValue = form.watch("cpf");

  const checkCpf = async () => {
    const cpfClean = cpfValue?.replace(/\D/g, "");
    
    if (!cpfClean || cpfClean.length !== 11) {
      setCpfError("CPF deve ter 11 dígitos");
      return;
    }

    setIsCheckingCpf(true);
    setCpfError(null);

    try {
      // Verificar na tabela de membros
      const { data: existingMembers } = await supabase
        .from("members")
        .select("id")
        .eq("cpf", cpfClean);

      if (existingMembers && existingMembers.length > 0) {
        setCpfError("USUÁRIO JÁ CADASTRADO");
        setCpfVerified(false);
        return;
      }

      // Verificar na tabela de solicitações pendentes
      const { data: existingRequests } = await supabase
        .from("member_requests")
        .select("id")
        .eq("cpf", cpfClean)
        .eq("status", "pendente");

      if (existingRequests && existingRequests.length > 0) {
        setCpfError("USUÁRIO JÁ CADASTRADO");
        setCpfVerified(false);
        return;
      }

      // CPF disponível
      setCpfVerified(true);
      setCpfError(null);
      toast({
        title: "CPF disponível",
        description: "Você pode continuar com o cadastro.",
      });
    } catch (error) {
      setCpfError("Erro ao verificar CPF. Tente novamente.");
    } finally {
      setIsCheckingCpf(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const cpfClean = data.cpf.replace(/\D/g, "");

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
    setCpfVerified(false);
    setCpfError(null);
    form.reset();
    onOpenChange(false);
  };

  // Reset verification when CPF changes
  const handleCpfChange = (value: string) => {
    form.setValue("cpf", formatCPF(value));
    setCpfVerified(false);
    setCpfError(null);
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
            Primeiro, informe seu CPF para verificar se você já está cadastrado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            {/* CPF Field - First and with lookup button */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          value={field.value}
                          onChange={(e) => handleCpfChange(e.target.value)}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        onClick={checkCpf}
                        disabled={isCheckingCpf || !cpfValue || cpfValue.length < 14}
                        variant={cpfVerified ? "default" : "secondary"}
                      >
                        {isCheckingCpf ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Consultar</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {cpfError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cpfError}</AlertDescription>
                </Alert>
              )}

              {cpfVerified && (
                <Alert className="mt-3 border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    CPF disponível! Preencha os demais dados abaixo.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Rest of the form - only shown after CPF verification */}
            {cpfVerified && (
              <>
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
              </>
            )}

            {/* Show cancel button even before verification */}
            {!cpfVerified && (
              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
