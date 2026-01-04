import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  MessageCircle,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AprovacaoCandidaturasTabProps {
  ministryId: string;
}

export const AprovacaoCandidaturasTab = ({ ministryId }: AprovacaoCandidaturasTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pendente");
  const [selectedCandidatura, setSelectedCandidatura] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: candidaturas = [], isLoading } = useQuery({
    queryKey: ["candidaturas-ministerio", ministryId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("candidaturas_ministerio")
        .select(`
          *,
          members (id, full_name, whatsapp, photo_url)
        `)
        .eq("ministry_id", ministryId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!ministryId,
  });

  const approveMutation = useMutation({
    mutationFn: async (candidaturaId: string) => {
      const candidatura = candidaturas.find((c) => c.id === candidaturaId);
      if (!candidatura) throw new Error("Candidatura não encontrada");

      // Atualizar status para aprovado
      const { error: updateError } = await supabase
        .from("candidaturas_ministerio")
        .update({ status: "aprovado" })
        .eq("id", candidaturaId);

      if (updateError) throw updateError;

      // Adicionar membro ao ministério (criar função de integrante)
      const { error: functionError } = await supabase
        .from("member_functions")
        .insert({
          member_id: candidatura.member_id,
          ministry_id: ministryId,
          function_type: "integrante_ministerio",
        });

      // Ignorar erro se já existir a função
      if (functionError && !functionError.message.includes("duplicate")) {
        console.error("Erro ao adicionar função:", functionError);
      }

      return candidatura;
    },
    onSuccess: (candidatura) => {
      queryClient.invalidateQueries({ queryKey: ["candidaturas-ministerio"] });
      toast({
        title: "Candidatura aprovada!",
        description: `${candidatura.members?.full_name} foi adicionado(a) ao ministério.`,
      });
      setShowApproveDialog(false);
      setSelectedCandidatura(null);
    },
    onError: () => {
      toast({
        title: "Erro ao aprovar candidatura",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ candidaturaId, reason }: { candidaturaId: string; reason: string }) => {
      const { error } = await supabase
        .from("candidaturas_ministerio")
        .update({ 
          status: "rejeitado",
          // O motivo poderia ser salvo em um campo de observações se existir
        })
        .eq("id", candidaturaId);

      if (error) throw error;
      return candidaturas.find((c) => c.id === candidaturaId);
    },
    onSuccess: (candidatura) => {
      queryClient.invalidateQueries({ queryKey: ["candidaturas-ministerio"] });
      toast({
        title: "Candidatura rejeitada",
        description: candidatura?.members?.full_name || "Candidatura atualizada",
      });
      setShowRejectDialog(false);
      setSelectedCandidatura(null);
      setRejectReason("");
    },
    onError: () => {
      toast({
        title: "Erro ao rejeitar candidatura",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pendente
          </Badge>
        );
      case "aprovado":
        return (
          <Badge className="gap-1 bg-green-500">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleOpenWhatsApp = (whatsapp: string, nome: string) => {
    const texto = encodeURIComponent(
      `Olá ${nome}! Sobre sua candidatura ao ministério...`
    );
    const phone = whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${texto}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de status */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filtrar por status:</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="rejeitado">Rejeitados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de candidaturas */}
      {candidaturas.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">Nenhuma candidatura encontrada</p>
            <p className="text-sm">
              {statusFilter === "pendente"
                ? "Não há candidaturas pendentes no momento."
                : "Não há candidaturas com este status."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {candidaturas.map((candidatura) => (
            <Card key={candidatura.id} className="overflow-hidden">
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  {/* Avatar/Foto */}
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {candidatura.members?.photo_url ? (
                      <img
                        src={candidatura.members.photo_url}
                        alt={candidatura.members.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium">
                          {candidatura.members?.full_name || "Membro"}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(candidatura.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      {getStatusBadge(candidatura.status)}
                    </div>

                    {candidatura.mensagem && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                        "{candidatura.mensagem}"
                      </p>
                    )}

                    {/* Ações */}
                    <div className="flex items-center gap-2 mt-3">
                      {candidatura.members?.whatsapp && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleOpenWhatsApp(
                              candidatura.members.whatsapp,
                              candidatura.members.full_name
                            )
                          }
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
                      )}

                      {candidatura.status === "pendente" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedCandidatura(candidatura);
                              setShowApproveDialog(true);
                            }}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedCandidatura(candidatura);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Aprovação */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar candidatura?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCandidatura?.members?.full_name} será adicionado(a) como
              integrante do ministério.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveMutation.mutate(selectedCandidatura?.id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar candidatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejeitar candidatura de{" "}
              <strong>{selectedCandidatura?.members?.full_name}</strong>?
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectMutation.mutate({
                  candidaturaId: selectedCandidatura?.id,
                  reason: rejectReason,
                })
              }
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
