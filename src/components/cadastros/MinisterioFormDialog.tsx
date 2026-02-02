import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatNameField } from "@/lib/text-utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAprovadorId, useMudancasPendentes } from "@/hooks/useMudancasPendentes";
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
import { MemberSelect } from "@/components/ui/member-select";
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
  lider_id: z.string().optional(),
  lider_esposa_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Ministry {
  id: string;
  name: string;
  description: string | null;
  lider_id: string | null;
  lider_esposa_id: string | null;
}

interface MinisterioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  item?: Ministry | null;
  onSave: (data: { 
    name: string; 
    description: string; 
    lider_id: string | null;
    lider_esposa_id: string | null;
  }) => void;
  isSaving: boolean;
}

interface PendingApproval {
  tipoMudanca: string;
  membroId: string;
  membroAtualId: string | null;
  label: string;
}

const MinisterioFormDialog = ({
  open,
  onOpenChange,
  title,
  item,
  onSave,
  isSaving,
}: MinisterioFormDialogProps) => {
  const { user } = useAuth();
  const { createMudanca, isCreating } = useMudancasPendentes();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [formDataToSave, setFormDataToSave] = useState<FormData | null>(null);

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
      lider_id: "",
      lider_esposa_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          name: item.name,
          description: item.description || "",
          lider_id: item.lider_id || "",
          lider_esposa_id: item.lider_esposa_id || "",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          lider_id: "",
          lider_esposa_id: "",
        });
      }
    }
  }, [item, open, form]);

  const handleSubmit = async (data: FormData) => {
    // Check for leadership changes that need approval
    const leadershipChanges: PendingApproval[] = [];

    // Check líder change
    if (item && data.lider_id !== (item.lider_id || "")) {
      if (item.lider_id && data.lider_id) {
        // Replacing existing leader
        leadershipChanges.push({
          tipoMudanca: "lider_ministerio",
          membroId: data.lider_id,
          membroAtualId: item.lider_id,
          label: "Líder do Ministério",
        });
      } else if (data.lider_id && !item.lider_id) {
        // Adding new leader where there was none
        leadershipChanges.push({
          tipoMudanca: "lider_ministerio",
          membroId: data.lider_id,
          membroAtualId: null,
          label: "Líder do Ministério",
        });
      }
    }

    // Check líder esposa change
    if (item && data.lider_esposa_id !== (item.lider_esposa_id || "")) {
      if (item.lider_esposa_id && data.lider_esposa_id) {
        // Replacing existing leader
        leadershipChanges.push({
          tipoMudanca: "lider_esposa_ministerio",
          membroId: data.lider_esposa_id,
          membroAtualId: item.lider_esposa_id,
          label: "Líder do Ministério (Cônjuge)",
        });
      } else if (data.lider_esposa_id && !item.lider_esposa_id) {
        // Adding new leader where there was none
        leadershipChanges.push({
          tipoMudanca: "lider_esposa_ministerio",
          membroId: data.lider_esposa_id,
          membroAtualId: null,
          label: "Líder do Ministério (Cônjuge)",
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
        lider_id: data.lider_id || null,
        lider_esposa_id: data.lider_esposa_id || null,
      });
    }
  };

  const handleApprovalConfirm = async () => {
    if (!formDataToSave || !item || !currentMember) return;

    try {
      // Create approval requests for each leadership change
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
          ministry_id: item.id,
          membro_id: approval.membroId,
          membro_atual_id: approval.membroAtualId,
        });
      }

      // Save non-leadership fields (name, description)
      onSave({
        name: formatNameField(formDataToSave.name),
        description: formDataToSave.description || "",
        lider_id: item.lider_id, // Keep existing leaders
        lider_esposa_id: item.lider_esposa_id, // Keep existing leaders
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
        <DialogContent className="bg-card border-border max-w-lg">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <AlertDialogTitle>Alteração de Liderança</AlertDialogTitle>
            <AlertDialogDescription>
              Você está alterando a liderança deste ministério. Esta alteração precisa ser aprovada pelo Pastor.
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

export default MinisterioFormDialog;
