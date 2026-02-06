import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { formatNameField, toTitleCase } from "@/lib/text-utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAprovadorId, useMudancasPendentes, hasPerfilSemAprovacao, hasRoleSemAprovacao } from "@/hooks/useMudancasPendentes";
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
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MemberSelect } from "@/components/ui/member-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast as sonnerToast } from "sonner";

// Opções de dias da semana
const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

// Opções de frequência
const FREQUENCIAS = [
  "Semanal",
  "Quinzenal",
  "Mensal",
];

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  lider_id: z.string().nullable().optional(),
  lider_esposa_id: z.string().nullable().optional(),
  anfitriao_id: z.string().nullable().optional(),
  anfitriao_esposa_id: z.string().nullable().optional(),
  supervisor_id: z.string().nullable().optional(),
  supervisor_esposa_id: z.string().nullable().optional(),
  condominio: z.string().optional(),
  dias: z.string().optional(),
  frequencia: z.string().optional(),
  data_inicio_cr: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  numero: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CasaRefugio {
  id: string;
  name: string;
  anfitrioes: string | null;
  condominio: string | null;
  lideres: string | null;
  supervisores: string | null;
  dias: string | null;
  frequencia: string | null;
  data_inicio_cr: string | null;
  cep: string | null;
  address: string | null;
  numero: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  lider_id?: string | null;
  lider_esposa_id?: string | null;
  anfitriao_id?: string | null;
  anfitriao_esposa_id?: string | null;
  supervisor_id?: string | null;
  supervisor_esposa_id?: string | null;
}

interface CasaRefugioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: CasaRefugio | null;
}

interface PendingApproval {
  tipoMudanca: string;
  membroId: string;
  membroAtualId: string | null;
  label: string;
}

const CasaRefugioFormDialog = ({ open, onOpenChange, item }: CasaRefugioFormDialogProps) => {
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { createMudanca, isCreating } = useMudancasPendentes();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [formDataToSave, setFormDataToSave] = useState<FormData | null>(null);

  // Buscar o membro vinculado ao usuário atual e suas funções
  const { data: currentMember } = useQuery({
    queryKey: ["current-member-with-functions", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, member_functions(function_type)")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar os roles do usuário atual
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) return [];
      return data.map((r: any) => r.role);
    },
    enabled: !!user?.id,
  });

  // Buscar lista de condomínios para o dropdown
  const { data: condominios = [] } = useQuery({
    queryKey: ["condominios-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Verificar se o usuário atual tem perfil que dispensa aprovação (function_types OU roles)
  const currentMemberFunctionTypes = currentMember?.member_functions?.map((f: any) => f.function_type) || [];
  const skipApproval = hasPerfilSemAprovacao(currentMemberFunctionTypes) || hasRoleSemAprovacao(userRoles);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      lider_id: null,
      lider_esposa_id: null,
      anfitriao_id: null,
      anfitriao_esposa_id: null,
      supervisor_id: null,
      supervisor_esposa_id: null,
      condominio: "",
      dias: "",
      frequencia: "",
      data_inicio_cr: "",
      cep: "",
      address: "",
      numero: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          lider_id: item.lider_id || null,
          lider_esposa_id: item.lider_esposa_id || null,
          anfitriao_id: item.anfitriao_id || null,
          anfitriao_esposa_id: item.anfitriao_esposa_id || null,
          supervisor_id: item.supervisor_id || null,
          supervisor_esposa_id: item.supervisor_esposa_id || null,
          condominio: item.condominio || "",
          dias: item.dias || "",
          frequencia: item.frequencia || "",
          data_inicio_cr: item.data_inicio_cr || "",
          cep: item.cep || "",
          address: item.address || "",
          numero: item.numero || "",
          complement: item.complement || "",
          neighborhood: item.neighborhood || "",
          city: item.city || "",
          state: item.state || "",
        });
      } else {
        form.reset({
          name: "",
          lider_id: null,
          lider_esposa_id: null,
          anfitriao_id: null,
          anfitriao_esposa_id: null,
          supervisor_id: null,
          supervisor_esposa_id: null,
          condominio: "",
          dias: "",
          frequencia: "",
          data_inicio_cr: "",
          cep: "",
          address: "",
          numero: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        });
      }
    }
  }, [item, open, form]);

  const saveDirectMutation = useMutation({
    mutationFn: async (data: FormData & { keepLeadership?: boolean }) => {
      const payload = {
        name: formatNameField(data.name),
        lider_id: data.keepLeadership ? (item?.lider_id || null) : (data.lider_id || null),
        lider_esposa_id: data.keepLeadership ? (item?.lider_esposa_id || null) : (data.lider_esposa_id || null),
        anfitriao_id: data.keepLeadership ? (item?.anfitriao_id || null) : (data.anfitriao_id || null),
        anfitriao_esposa_id: data.keepLeadership ? (item?.anfitriao_esposa_id || null) : (data.anfitriao_esposa_id || null),
        supervisor_id: data.keepLeadership ? (item?.supervisor_id || null) : (data.supervisor_id || null),
        supervisor_esposa_id: data.keepLeadership ? (item?.supervisor_esposa_id || null) : (data.supervisor_esposa_id || null),
        condominio: data.condominio ? toTitleCase(data.condominio) : null,
        dias: data.dias || null,
        frequencia: data.frequencia || null,
        data_inicio_cr: data.data_inicio_cr || null,
        cep: data.cep || null,
        address: data.address ? toTitleCase(data.address) : null,
        numero: data.numero || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood ? toTitleCase(data.neighborhood) : null,
        city: data.city ? toTitleCase(data.city) : null,
        state: data.state?.toUpperCase() || null,
        lideres: null,
        anfitrioes: null,
        supervisores: null,
      };

      if (item) {
        const { error } = await supabase
          .from("casas_refugio")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("casas_refugio").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["casas_refugio"] });
      queryClient.invalidateQueries({ queryKey: ["casas-refugio-homepage"] });
      toast({ title: item ? "Casa Refúgio atualizada!" : "Casa Refúgio cadastrada!" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao salvar Casa Refúgio", variant: "destructive" });
    },
  });

  const checkLeadershipChanges = (data: FormData): PendingApproval[] => {
    if (!item) return []; // No approval needed for new items
    
    const changes: PendingApproval[] = [];
    
    const leadershipFields = [
      { field: "lider_id", tipoMudanca: "lider_casa_refugio", label: "Líder de Casa Refúgio" },
      { field: "lider_esposa_id", tipoMudanca: "lider_esposa_casa_refugio", label: "Líder de Casa Refúgio" },
      { field: "supervisor_id", tipoMudanca: "supervisor_casa_refugio", label: "Supervisor de Casa Refúgio" },
      { field: "supervisor_esposa_id", tipoMudanca: "supervisor_esposa_casa_refugio", label: "Supervisor de Casa Refúgio" },
      { field: "anfitriao_id", tipoMudanca: "anfitriao_casa_refugio", label: "Anfitrião de Casa Refúgio" },
      { field: "anfitriao_esposa_id", tipoMudanca: "anfitriao_esposa_casa_refugio", label: "Anfitrião de Casa Refúgio" },
    ] as const;

    for (const { field, tipoMudanca, label } of leadershipFields) {
      const newValue = data[field] || null;
      const oldValue = (item as any)[field] || null;

      if (newValue !== oldValue) {
        if (oldValue && newValue) {
          // Replacing existing
          changes.push({
            tipoMudanca,
            membroId: newValue,
            membroAtualId: oldValue,
            label,
          });
        } else if (newValue && !oldValue) {
          // Adding new
          changes.push({
            tipoMudanca,
            membroId: newValue,
            membroAtualId: null,
            label,
          });
        }
      }
    }

    return changes;
  };

  const handleSubmit = async (data: FormData) => {
    const leadershipChanges = checkLeadershipChanges(data);

    // Se tem perfil sem aprovação (pastor geral, auxiliar, admin), salva direto
    if (skipApproval || leadershipChanges.length === 0) {
      // Save directly without approval
      saveDirectMutation.mutate(data);
    } else {
      // Precisa de aprovação
      setPendingApprovals(leadershipChanges);
      setFormDataToSave(data);
      setShowApprovalDialog(true);
    }
  };

  const handleApprovalConfirm = async () => {
    if (!formDataToSave || !item || !currentMember) return;

    try {
      for (const approval of pendingApprovals) {
        const aprovadorId = await getAprovadorId(approval.tipoMudanca, item.id);
        
        if (!aprovadorId) {
          sonnerToast.error(`Não foi possível encontrar o aprovador para ${approval.label}`);
          continue;
        }

        createMudanca({
          solicitante_id: currentMember.id,
          aprovador_id: aprovadorId,
          tipo_mudanca: approval.tipoMudanca,
          acao: approval.membroAtualId ? "alterar" : "adicionar",
          casa_refugio_id: item.id,
          membro_id: approval.membroId,
          membro_atual_id: approval.membroAtualId,
        });
      }

      // Save non-leadership fields (keep existing leadership)
      saveDirectMutation.mutate({ ...formDataToSave, keepLeadership: true } as FormData & { keepLeadership: boolean });
    } catch (error) {
      console.error("Erro ao criar solicitações de aprovação:", error);
      sonnerToast.error("Erro ao enviar solicitações de aprovação");
    }

    setShowApprovalDialog(false);
    setPendingApprovals([]);
    setFormDataToSave(null);
  };

  const handleApprovalCancel = () => {
    setShowApprovalDialog(false);
    setPendingApprovals([]);
    setFormDataToSave(null);
  };

  const handleCepBlur = async () => {
    const cep = form.getValues("cep")?.replace(/\D/g, "");
    if (cep?.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("address", data.logradouro || "");
        form.setValue("neighborhood", data.bairro || "");
        form.setValue("city", data.localidade || "");
        form.setValue("state", data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const getApproverDescription = (): string => {
    const types = pendingApprovals.map(p => p.tipoMudanca);
    if (types.some(t => t.includes("supervisor"))) {
      return "Síndico do Condomínio";
    }
    if (types.some(t => t.includes("lider") && !t.includes("anfitriao"))) {
      return "Supervisor da Casa Refúgio";
    }
    if (types.some(t => t.includes("anfitriao"))) {
      return "Líder da Casa Refúgio";
    }
    return "Pastor";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-h-[90vh] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{item ? "Editar Casa Refúgio" : "Nova Casa Refúgio"}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* 1. Casa Refúgio (Nome) */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Casa Refúgio *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome da Casa Refúgio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Líderes Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Líderes</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="lider_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Líder</FormLabel>
                          <FormControl>
                            <MemberSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecionar líder..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lider_esposa_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Líder</FormLabel>
                          <FormControl>
                            <MemberSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecionar líder..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Anfitriões Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Anfitriões</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="anfitriao_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anfitrião</FormLabel>
                          <FormControl>
                            <MemberSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecionar anfitrião..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="anfitriao_esposa_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anfitrião</FormLabel>
                          <FormControl>
                            <MemberSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecionar anfitrião..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 3. Condomínio */}
                <FormField
                  control={form.control}
                  name="condominio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condomínio</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o condomínio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {condominios.map((cond) => (
                            <SelectItem key={cond.id} value={cond.name}>
                              {cond.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supervisores Section */}
                <div className="border rounded-lg p-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Supervisores</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="supervisor_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor</FormLabel>
                          <FormControl>
                            <MemberSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecionar supervisor..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supervisor_esposa_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supervisor</FormLabel>
                          <FormControl>
                            <MemberSelect
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecionar supervisor..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* 6. Dias da Casa Refúgio */}
                <FormField
                  control={form.control}
                  name="dias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias da Casa Refúgio</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o dia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DIAS_SEMANA.map((dia) => (
                            <SelectItem key={dia} value={dia}>
                              {dia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 7. Frequência */}
                <FormField
                  control={form.control}
                  name="frequencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequência</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a frequência" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCIAS.map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {freq}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Início da CR */}
                <FormField
                  control={form.control}
                  name="data_inicio_cr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início da CR (1ª reunião do ano)</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ""}
                          onChange={field.onChange}
                          maxDate={undefined}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Endereço</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* 8. CEP */}
                    <FormField
                      control={form.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                placeholder="00000-000"
                                onBlur={handleCepBlur}
                                inputMode="numeric"
                              />
                              {isLoadingCep && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 9. Endereço */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Rua, Avenida..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 10. Número */}
                    <FormField
                      control={form.control}
                      name="numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nº" inputMode="numeric" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 10b. Complemento */}
                    <FormField
                      control={form.control}
                      name="complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Apto, Bloco..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 11. Bairro */}
                    <FormField
                      control={form.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Bairro" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 12. Cidade */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cidade</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Cidade" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* 13. UF */}
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="UF" maxLength={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-secondary hover:bg-secondary/90" 
                    disabled={saveDirectMutation.isPending || isCreating}
                  >
                    {(saveDirectMutation.isPending || isCreating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {item ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Alteração de Liderança</AlertDialogTitle>
            <AlertDialogDescription>
              Você está alterando posições de liderança nesta Casa Refúgio. Esta alteração precisa ser aprovada pelo {getApproverDescription()}.
              <br /><br />
              <strong>Alterações:</strong>
              <ul className="list-disc pl-4 mt-2">
                {pendingApprovals.map((approval, index) => (
                  <li key={index}>{approval.label}</li>
                ))}
              </ul>
              <br />
              Deseja enviar a solicitação de aprovação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleApprovalCancel}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprovalConfirm} className="bg-secondary hover:bg-secondary/90">
              Sim, enviar para aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CasaRefugioFormDialog;
