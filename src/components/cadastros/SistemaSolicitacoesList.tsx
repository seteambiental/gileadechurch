import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CheckCircle2, XCircle, Clock, Trash2, RotateCcw, Flag, Image as ImageIcon, MessageSquare, Reply, ThumbsUp, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import SistemaSolicitacaoFormDialog from "./SistemaSolicitacaoFormDialog";
import SistemaRespostaDialog from "./SistemaRespostaDialog";

interface Props {
  tipo: "melhoria" | "erro" | "implementacao";
  hideAdminActions?: boolean;
}

const LABELS: Record<string, { title: string; addLabel: string }> = {
  melhoria: { title: "Melhorias", addLabel: "+Melhoria" },
  erro: { title: "Erros", addLabel: "+Erro" },
  implementacao: { title: "Implementações", addLabel: "+Implementação" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  enviada: { label: "Enviada", variant: "outline", icon: <Clock className="w-3 h-3" /> },
  aceita: { label: "Aceita", variant: "secondary", icon: <CheckCircle2 className="w-3 h-3" /> },
  rejeitada: { label: "Rejeitada", variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
  em_desenvolvimento: { label: "Em Desenvolvimento", variant: "default", icon: <Flag className="w-3 h-3" /> },
  finalizado: { label: "Finalizado", variant: "secondary", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const SistemaSolicitacoesList = ({ tipo, hideAdminActions }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "aceitar" | "rejeitar" | "finalizar" | "responder" | "confirmar";
    itemId: string;
  } | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("sistema_solicitacoes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sistema_solicitacoes", tipo] });
      toast.success("Solicitação atualizada!");
      setActionDialog(null);
    },
    onError: () => toast.error("Erro ao atualizar solicitação"),
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

  const handleAction = (texto: string) => {
    if (!actionDialog) return;

    const getAdminName = async () => {
      const { data } = await supabase
        .from("members")
        .select("full_name")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data?.full_name || user?.email || "Admin";
    };

    if (actionDialog.type === "responder") {
      getAdminName().then((nome) => {
        updateMutation.mutate({
          id: actionDialog.itemId,
          updates: {
            resposta_solicitante: texto || null,
            resposta_solicitante_em: new Date().toISOString(),
          },
        });
      });
      return;
    }

    if (actionDialog.type === "confirmar") {
      updateMutation.mutate({
        id: actionDialog.itemId,
        updates: {
          confirmacao_solicitante: texto || "Confirmado",
          confirmado_em: new Date().toISOString(),
        },
      });
      return;
    }

    getAdminName().then((adminName) => {
      if (actionDialog.type === "aceitar") {
        updateMutation.mutate({
          id: actionDialog.itemId,
          updates: {
            status: "em_desenvolvimento",
            resposta_admin: texto || null,
            respondido_por: adminName,
            respondido_em: new Date().toISOString(),
          },
        });
      } else if (actionDialog.type === "rejeitar") {
        updateMutation.mutate({
          id: actionDialog.itemId,
          updates: {
            status: "rejeitada",
            resposta_admin: texto || null,
            respondido_por: adminName,
            respondido_em: new Date().toISOString(),
          },
        });
      } else if (actionDialog.type === "finalizar") {
        updateMutation.mutate({
          id: actionDialog.itemId,
          updates: {
            status: "finalizado",
            observacao_finalizacao: texto || null,
            finalizado_por: adminName,
            finalizado_em: new Date().toISOString(),
          },
        });
      }
    });
  };

  const handleReopen = (id: string) => {
    updateMutation.mutate({
      id,
      updates: {
        status: "enviada",
        resposta_admin: null,
        observacao_finalizacao: null,
        respondido_por: null,
        respondido_em: null,
        finalizado_por: null,
        finalizado_em: null,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] || { label: status, variant: "outline" as const, icon: <Clock className="w-3 h-3" /> };
    return (
      <Badge variant={cfg.variant} className="flex items-center gap-1">
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  const canDelete = (item: any) => {
    if (isAdmin) return true;
    return item.solicitante_id === user?.id;
  };

  const isOwner = (item: any) => item.solicitante_id === user?.id;

  const getDialogConfig = () => {
    if (!actionDialog) return { title: "", label: "", confirmLabel: "", confirmVariant: "default" as const };
    switch (actionDialog.type) {
      case "aceitar":
        return { title: "Aceitar Solicitação", label: "Observações (opcional)", confirmLabel: "Aceitar", confirmVariant: "default" as const };
      case "rejeitar":
        return { title: "Rejeitar Solicitação", label: "Motivo da rejeição (opcional)", confirmLabel: "Rejeitar", confirmVariant: "destructive" as const };
      case "finalizar":
        return { title: "Finalizar Solicitação", label: "Observações de finalização (opcional)", confirmLabel: "Finalizar", confirmVariant: "default" as const };
      case "responder":
        return { title: "Responder Solicitação", label: "Sua resposta", confirmLabel: "Enviar Resposta", confirmVariant: "default" as const };
      case "confirmar":
        return { title: "Confirmar Solução", label: "Comentário sobre a solução (opcional)", confirmLabel: "Confirmar Solução", confirmVariant: "default" as const };
    }
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
          {solicitacoes.map((item: any) => (
            <Card key={item.id} className="border border-border">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">#{item.numero}</span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Admin actions */}
                      {!hideAdminActions && isAdmin && (
                        <>
                          {item.status === "enviada" && (
                            <>
                              <Button size="sm" variant="default" onClick={() => setActionDialog({ type: "aceitar", itemId: item.id })}>
                                Aceitar
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => setActionDialog({ type: "rejeitar", itemId: item.id })}>
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {item.status === "em_desenvolvimento" && (
                            <Button size="sm" variant="default" onClick={() => setActionDialog({ type: "finalizar", itemId: item.id })}>
                              Finalizar
                            </Button>
                          )}
                        </>
                      )}
                      {/* Requester reply - after acceptance, if owner and no reply yet */}
                      {isOwner(item) && item.status === "em_desenvolvimento" && item.resposta_admin && !item.resposta_solicitante && (
                        <Button size="sm" variant="outline" onClick={() => setActionDialog({ type: "responder", itemId: item.id })}>
                          <Reply className="w-3 h-3 mr-1" />
                          Responder
                        </Button>
                      )}
                      {/* Requester confirm - after finalization, if owner and no confirmation yet */}
                      {isOwner(item) && item.status === "finalizado" && !item.confirmacao_solicitante && (
                        <Button size="sm" variant="default" onClick={() => setActionDialog({ type: "confirmar", itemId: item.id })}>
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Confirmar Solução
                        </Button>
                      )}
                      {/* Reopen - both admin and user */}
                      {(item.status === "finalizado" || item.status === "rejeitada") && (
                        <Button size="sm" variant="outline" onClick={() => handleReopen(item.id)}>
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reabrir
                        </Button>
                      )}
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

                  {/* Description */}
                  <p className="text-sm text-foreground">{item.descricao}</p>

                  {/* Image or Video */}
                  {item.imagem_url && (
                    <div>
                      {/\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(item.imagem_url) ? (
                        <video src={item.imagem_url} controls className="w-full max-h-48 rounded-md border border-border mt-1" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedImage(item.imagem_url)}
                          className="block mt-1"
                        >
                          <img 
                            src={item.imagem_url} 
                            alt="Imagem anexada"
                            className="max-w-full max-h-48 rounded-md border border-border object-contain cursor-pointer hover:opacity-80 transition-opacity"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = document.createElement('span');
                              fallback.className = 'flex items-center gap-1 text-xs text-primary hover:underline';
                              fallback.innerHTML = '📎 Ver imagem anexada';
                              target.parentElement?.appendChild(fallback);
                            }}
                          />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {item.card && <span>Card: {item.card}</span>}
                    {item.aba && <span>Aba: {item.aba}</span>}
                    {item.sub_aba && <span>Sub-aba: {item.sub_aba}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Por {item.solicitante_nome || "—"} em {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>

                  {/* Admin response */}
                  {item.resposta_admin && (
                    <div className="bg-muted/50 rounded-md p-3 border border-border space-y-1">
                      <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <MessageSquare className="w-3 h-3" />
                        Resposta do Administrador
                      </div>
                      <p className="text-sm text-foreground">{item.resposta_admin}</p>
                      {item.respondido_por && (
                        <p className="text-xs text-muted-foreground">
                          Por {item.respondido_por} em {item.respondido_em ? format(new Date(item.respondido_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
                        </p>
                      )}
                    </div>
                    )}

                    {/* Requester reply */}
                    {item.resposta_solicitante && (
                      <div className="bg-accent/30 rounded-md p-3 border border-accent space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <Reply className="w-3 h-3" />
                          Resposta do Solicitante
                        </div>
                        <p className="text-sm text-foreground">{item.resposta_solicitante}</p>
                        {item.resposta_solicitante_em && (
                          <p className="text-xs text-muted-foreground">
                            Em {format(new Date(item.resposta_solicitante_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Finalization note */}
                    {item.observacao_finalizacao && (
                      <div className="bg-primary/5 rounded-md p-3 border border-primary/20 space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="w-3 h-3" />
                          Observação de Finalização
                        </div>
                        <p className="text-sm text-foreground">{item.observacao_finalizacao}</p>
                        {item.finalizado_por && (
                          <p className="text-xs text-muted-foreground">
                            Por {item.finalizado_por} em {item.finalizado_em ? format(new Date(item.finalizado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ""}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Requester confirmation */}
                    {item.confirmacao_solicitante && (
                      <div className="bg-green-500/10 rounded-md p-3 border border-green-500/30 space-y-1">
                        <div className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <ThumbsUp className="w-3 h-3" />
                          Solução Confirmada pelo Solicitante
                        </div>
                        <p className="text-sm text-foreground">{item.confirmacao_solicitante}</p>
                        {item.confirmado_em && (
                          <p className="text-xs text-muted-foreground">
                            Em {format(new Date(item.confirmado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SistemaSolicitacaoFormDialog open={showForm} onOpenChange={setShowForm} tipo={tipo} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />

      {/* Action response dialog */}
      {actionDialog && (
        <SistemaRespostaDialog
          open={!!actionDialog}
          onOpenChange={(open) => !open && setActionDialog(null)}
          isPending={updateMutation.isPending}
          onConfirm={handleAction}
          {...getDialogConfig()}
        />
      )}

      {/* Expanded image dialog */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <img src={expandedImage} alt="Imagem anexada" className="max-w-full max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default SistemaSolicitacoesList;
