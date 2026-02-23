import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CheckCircle2, XCircle, Clock, Circle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import SistemaSolicitacaoFormDialog from "./SistemaSolicitacaoFormDialog";

interface Props {
  tipo: "melhoria" | "erro" | "implementacao";
  hideAdminActions?: boolean;
}

const LABELS: Record<string, { title: string; addLabel: string }> = {
  melhoria: { title: "Melhorias", addLabel: "+Melhoria" },
  erro: { title: "Erros", addLabel: "+Erro" },
  implementacao: { title: "Implementações", addLabel: "+Implementação" },
};

const STATUS_CONFIG: Record<string, Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }>> = {
  melhoria: {
    enviada: { label: "Enviada", variant: "outline", icon: <Clock className="w-3 h-3" /> },
    producao: { label: "Para Produção", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
    rejeitada: { label: "Rejeitada", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  },
  erro: {
    enviada: { label: "Aguardando", variant: "outline", icon: <Clock className="w-3 h-3" /> },
    corrigido: { label: "Corrigido", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
    aguardando: { label: "Aguardando", variant: "secondary", icon: <Circle className="w-3 h-3" /> },
  },
  implementacao: {
    enviada: { label: "Enviada", variant: "outline", icon: <Clock className="w-3 h-3" /> },
    producao: { label: "Em Produção", variant: "default", icon: <CheckCircle2 className="w-3 h-3" /> },
    rejeitada: { label: "Rejeitada", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  },
};

const SistemaSolicitacoesList = ({ tipo, hideAdminActions }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const config = LABELS[tipo];

  const { data: isAdmin } = useQuery({
    queryKey: ["user_is_admin_sistema", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "pastor_geral"]);
      return data && data.length > 0;
    },
    enabled: !!user?.id,
  });

  const { data: solicitacoes, isLoading } = useQuery({
    queryKey: ["sistema_solicitacoes", tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sistema_solicitacoes")
        .select("*")
        .eq("tipo", tipo)
        .order("numero", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("sistema_solicitacoes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistema_solicitacoes", tipo] });
      toast.success("Status atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sistema_solicitacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistema_solicitacoes", tipo] });
      toast.success("Solicitação excluída!");
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir solicitação"),
  });

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[tipo]?.[status] || { label: status, variant: "outline" as const, icon: <Circle className="w-3 h-3" /> };
    return (
      <Badge variant={cfg.variant} className="flex items-center gap-1">
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  const getAdminActions = (item: any) => {
    if (hideAdminActions || !isAdmin) return null;

    if (tipo === "melhoria") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: item.id, status: "producao" })} disabled={item.status === "producao"}>
            Implementar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: item.id, status: "rejeitada" })} disabled={item.status === "rejeitada"}>
            Rejeitar
          </Button>
        </div>
      );
    }

    if (tipo === "erro") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: item.id, status: "corrigido" })} disabled={item.status === "corrigido"}>
            Corrigido
          </Button>
          <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: item.id, status: "aguardando" })} disabled={item.status === "aguardando"}>
            Aguardando
          </Button>
        </div>
      );
    }

    if (tipo === "implementacao") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: item.id, status: "producao" })} disabled={item.status === "producao"}>
            Acatar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: item.id, status: "rejeitada" })} disabled={item.status === "rejeitada"}>
            Rejeitar
          </Button>
        </div>
      );
    }

    return null;
  };

  const canDelete = (item: any) => {
    if (isAdmin) return true;
    return item.solicitante_id === user?.id;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {config.addLabel}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : !solicitacoes?.length ? (
        <p className="text-muted-foreground text-sm text-center py-8">Nenhuma solicitação registrada.</p>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((item) => (
            <Card key={item.id} className="border border-border">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">#{item.numero}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.painel === "gestao" ? "Gestão" : "Ministérios"}
                      </Badge>
                      {getStatusBadge(item.status)}
                    </div>
                    <p className="text-sm text-foreground">{item.descricao}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {item.card && <span>Card: {item.card}</span>}
                      {item.aba && <span>Aba: {item.aba}</span>}
                      {item.sub_aba && <span>Sub-aba: {item.sub_aba}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Por {item.solicitante_nome || "—"} em {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    {getAdminActions(item)}
                    {canDelete(item) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SistemaSolicitacaoFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        tipo={tipo}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
};

export default SistemaSolicitacoesList;
