import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, 
  UserPlus, 
  Check, 
  X, 
  MessageCircle,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TarefaVoluntariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa: {
    id: string;
    titulo: string;
    vagas_necessarias: number;
  };
}

interface Voluntario {
  id: string;
  tarefa_id: string;
  member_id: string;
  status: string;
  member?: {
    id: string;
    full_name: string;
    photo_url: string | null;
    whatsapp: string | null;
  };
}

export function TarefaVoluntariosDialog({ open, onOpenChange, tarefa }: TarefaVoluntariosDialogProps) {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const { data: voluntarios = [], isLoading: loadingVoluntarios } = useQuery({
    queryKey: ["servico-voluntarios", tarefa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servico_tarefa_voluntarios")
        .select("*, member:member_id(id, full_name, photo_url, whatsapp)")
        .eq("tarefa_id", tarefa.id);
      if (error) throw error;
      return data as Voluntario[];
    },
    enabled: open,
  });

  const { data: membros = [], isLoading: loadingMembros } = useQuery({
    queryKey: ["members-for-servico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, photo_url, whatsapp")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const addVoluntarioMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("servico_tarefa_voluntarios")
        .insert({
          tarefa_id: tarefa.id,
          member_id: memberId,
          status: "pendente",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servico-voluntarios", tarefa.id] });
      queryClient.invalidateQueries({ queryKey: ["servico-voluntarios-count"] });
      toast.success("Voluntário adicionado!");
      setSelectedMemberId("");
    },
    onError: () => {
      toast.error("Erro ao adicionar voluntário");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("servico_tarefa_voluntarios")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servico-voluntarios", tarefa.id] });
      queryClient.invalidateQueries({ queryKey: ["servico-voluntarios-count"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const removeVoluntarioMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("servico_tarefa_voluntarios")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servico-voluntarios", tarefa.id] });
      queryClient.invalidateQueries({ queryKey: ["servico-voluntarios-count"] });
      toast.success("Voluntário removido!");
    },
    onError: () => {
      toast.error("Erro ao remover voluntário");
    },
  });

  const enviarConvites = async () => {
    const pendentes = voluntarios.filter((v) => v.status === "pendente" && v.member?.whatsapp);
    if (pendentes.length === 0) {
      toast.error("Nenhum voluntário pendente com WhatsApp");
      return;
    }

    setIsSendingInvites(true);
    try {
      for (const vol of pendentes) {
        const mensagem = `Olá ${vol.member?.full_name?.split(" ")[0]}! 👋\n\nVocê foi convidado(a) para participar da tarefa:\n\n📋 *${tarefa.titulo}*\n\nPor favor, confirme sua participação respondendo esta mensagem. 🙏`;
        
        await supabase.functions.invoke("enviar-whatsapp", {
          body: {
            action: "mensagem_livre",
            telefone: vol.member?.whatsapp,
            mensagem,
          },
        });
      }
      toast.success(`Convites enviados para ${pendentes.length} pessoa(s)!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar convites");
    } finally {
      setIsSendingInvites(false);
    }
  };

  const membrosNaoVinculados = membros.filter(
    (m) => !voluntarios.some((v) => v.member_id === m.id)
  );

  const confirmados = voluntarios.filter((v) => v.status === "confirmado").length;
  const pendentes = voluntarios.filter((v) => v.status === "pendente").length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmado":
        return <Badge variant="default" className="bg-green-600">Confirmado</Badge>;
      case "pendente":
        return <Badge variant="secondary">Pendente</Badge>;
      case "recusado":
        return <Badge variant="destructive">Recusado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Voluntários - {tarefa.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Stats */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">{confirmados}</span>
              <span className="text-muted-foreground">/{tarefa.vagas_necessarias} confirmados</span>
              {pendentes > 0 && (
                <span className="text-yellow-600 ml-2">({pendentes} pendentes)</span>
              )}
            </div>
            {pendentes > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={enviarConvites}
                disabled={isSendingInvites}
                className="gap-1"
              >
                {isSendingInvites ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Enviar Convites
              </Button>
            )}
          </div>

          {/* Adicionar voluntário */}
          <div className="flex gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um membro..." />
              </SelectTrigger>
              <SelectContent>
                {membrosNaoVinculados.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedMemberId && addVoluntarioMutation.mutate(selectedMemberId)}
              disabled={!selectedMemberId || addVoluntarioMutation.isPending}
            >
              {addVoluntarioMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Lista de voluntários */}
          {loadingVoluntarios ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : voluntarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum voluntário adicionado ainda
            </div>
          ) : (
            <div className="space-y-2">
              {voluntarios.map((vol) => (
                <div
                  key={vol.id}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={vol.member?.photo_url || undefined} />
                      <AvatarFallback className="bg-muted text-xs">
                        {vol.member?.full_name ? getInitials(vol.member.full_name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{vol.member?.full_name}</p>
                      {statusBadge(vol.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {vol.status === "pendente" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => updateStatusMutation.mutate({ id: vol.id, status: "confirmado" })}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatusMutation.mutate({ id: vol.id, status: "recusado" })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {vol.member?.whatsapp && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const url = `https://wa.me/55${vol.member?.whatsapp?.replace(/\D/g, "")}`;
                          window.open(url, "_blank");
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeVoluntarioMutation.mutate(vol.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
