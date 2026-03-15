import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatNameField } from "@/lib/text-utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAprovadorId, useMudancasPendentes, hasRoleSemAprovacao } from "@/hooks/useMudancasPendentes";
import { useUserAccess } from "@/hooks/useUserAccess";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ClearableSelect } from "@/components/ui/clearable-select";
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
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  sindico_id: z.string().optional(),
  sindico_esposa_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Condominio {
  id: string;
  name: string;
  description: string | null;
  sindico_id: string | null;
  sindico_esposa_id: string | null;
}

interface CondominioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item?: Condominio | null;
  onSave: (data: { name: string; description: string; sindico_id: string | null; sindico_esposa_id: string | null }) => void;
  isSaving: boolean;
}

interface PendingApproval {
  tipoMudanca: string;
  membroId: string;
  membroAtualId: string | null;
  label: string;
}

const CondominioFormDialog = ({
  open,
  onOpenChange,
  title,
  item,
  onSave,
  isSaving,
}: CondominioFormDialogProps) => {
  const { user } = useAuth();
  const { isAdmin, roles } = useUserAccess(user?.id);
  const { createMudanca, isCreating } = useMudancasPendentes();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [formDataToSave, setFormDataToSave] = useState<FormData | null>(null);

  // Verifica se o usuário pode fazer alterações sem aprovação
  const canBypassApproval = isAdmin || hasRoleSemAprovacao(roles);

  // Buscar o membro vinculado ao usuário atual
  const { data: currentMember } = useQuery({
    queryKey: ["current-member", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      sindico_id: "",
      sindico_esposa_id: "",
    },
  });

  // Fetch members for syndic selection
  const { data: members = [] } = useQuery({
    queryKey: ["members-for-sindico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description || "",
          sindico_id: item.sindico_id || "",
          sindico_esposa_id: item.sindico_esposa_id || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          sindico_id: "",
          sindico_esposa_id: "",
        });
      }
    }
  }, [item, open, form]);

  const handleSubmit = async (data: FormData) => {
    // Check for syndic changes that need approval
    const leadershipChanges: PendingApproval[] = [];

    const newSindicoId = data.sindico_id && data.sindico_id !== "none" ? data.sindico_id : null;
    const newSindicoEsposaId = data.sindico_esposa_id && data.sindico_esposa_id !== "none" ? data.sindico_esposa_id : null;

    // Check síndico change
    if (item && newSindicoId !== item.sindico_id) {
      if (item.sindico_id && newSindicoId) {
        leadershipChanges.push({
          tipoMudanca: "sindico_condominio",
          membroId: newSindicoId,
          membroAtualId: item.sindico_id,
          label: "Síndico do Condomínio",
        });
      } else if (newSindicoId && !item.sindico_id) {
        leadershipChanges.push({
          tipoMudanca: "sindico_condominio",
          membroId: newSindicoId,
          membroAtualId: null,
          label: "Síndico do Condomínio",
        });
      }
    }

    // Check síndico esposa change
    if (item && newSindicoEsposaId !== item.sindico_esposa_id) {
      if (item.sindico_esposa_id && newSindicoEsposaId) {
        leadershipChanges.push({
          tipoMudanca: "sindico_esposa_condominio",
          membroId: newSindicoEsposaId,
          membroAtualId: item.sindico_esposa_id,
          label: "Síndico do Condomínio (Cônjuge)",
        });
      } else if (newSindicoEsposaId && !item.sindico_esposa_id) {
        leadershipChanges.push({
          tipoMudanca: "sindico_esposa_condominio",
          membroId: newSindicoEsposaId,
          membroAtualId: null,
          label: "Síndico do Condomínio (Cônjuge)",
        });
      }
    }

    if (leadershipChanges.length > 0) {
      setPendingApprovals(leadershipChanges);
      setFormDataToSave(data);
      setShowApprovalDialog(true);
    } else {
      // No leadership changes, save directly
      onSave({
        name: formatNameField(data.name),
        description: data.description || "",
        sindico_id: newSindicoId,
        sindico_esposa_id: newSindicoEsposaId,
      });
    }
  };

  const handleApprovalConfirm = async () => {
    if (!formDataToSave || !item || !currentMember) return;

    try {
      for (const approval of pendingApprovals) {
        const aprovadorId = await getAprovadorId(approval.tipoMudanca, item.id);
        
        if (!aprovadorId) {
          toast.error(`Não foi possível encontrar o aprovador para ${approval.label}`);
          continue;
        }

        createMudanca({
          solicitante_id: currentMember.id,
          aprovador_id: aprovadorId,
          tipo_mudanca: approval.tipoMudanca,
          acao: approval.membroAtualId ? "alterar" : "adicionar",
          condominio_id: item.id,
          membro_id: approval.membroId,
          membro_atual_id: approval.membroAtualId,
        });
      }

      // Save non-leadership fields
      onSave({
        name: formatNameField(formDataToSave.name),
        description: formDataToSave.description || "",
        sindico_id: item.sindico_id,
        sindico_esposa_id: item.sindico_esposa_id,
      });
    } catch (error) {
      console.error("Erro ao criar solicitações de aprovação:", error);
      toast.error("Erro ao enviar solicitações de aprovação");
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sindico_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Síndico</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || "")}
                        options={members.map((member) => ({
                          value: member.id,
                          label: member.full_name,
                        }))}
                        placeholder="Selecione o síndico"
                        emptyLabel="Nenhum"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sindico_esposa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Síndico (Cônjuge)</FormLabel>
                    <FormControl>
                      <ClearableSelect
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || "")}
                        options={members.map((member) => ({
                          value: member.id,
                          label: member.full_name,
                        }))}
                        placeholder="Selecione o síndico"
                        emptyLabel="Nenhum"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-secondary hover:bg-secondary/90" disabled={isSaving || isCreating}>
                  {(isSaving || isCreating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {item ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Alteração de Síndico</AlertDialogTitle>
            <AlertDialogDescription>
              Você está alterando o síndico deste condomínio. Esta alteração precisa ser aprovada pelo Pastor.
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

export default CondominioFormDialog;
