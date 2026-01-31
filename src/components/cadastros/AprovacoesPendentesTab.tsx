import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMudancasPendentes,
  MudancaPendente,
  tipoMudancaLabels,
  acaoLabels,
} from "@/hooks/useMudancasPendentes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Check, X, Clock, Loader2, Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AprovacoesPendentesTab = () => {
  const { user } = useAuth();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Buscar o member_id do usuário atual
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

  const { mudancas, isLoading, processarMudanca, isProcessing } = useMudancasPendentes(
    currentMember?.id
  );

  const handleAprovar = (mudancaId: string) => {
    setApprovingId(mudancaId);
  };

  const confirmarAprovacao = () => {
    if (!approvingId || !currentMember?.id) return;
    processarMudanca({
      mudanca_id: approvingId,
      aprovar: true,
      aprovador_member_id: currentMember.id,
    });
    setApprovingId(null);
  };

  const handleRejeitar = (mudancaId: string) => {
    setRejectingId(mudancaId);
    setMotivoRejeicao("");
  };

  const confirmarRejeicao = () => {
    if (!rejectingId || !currentMember?.id) return;
    processarMudanca({
      mudanca_id: rejectingId,
      aprovar: false,
      motivo_rejeicao: motivoRejeicao || undefined,
      aprovador_member_id: currentMember.id,
    });
    setRejectingId(null);
    setMotivoRejeicao("");
  };

  const getEntidadeNome = (mudanca: MudancaPendente): string => {
    if (mudanca.ministry) return mudanca.ministry.name;
    if (mudanca.casa_refugio) return mudanca.casa_refugio.name;
    if (mudanca.condominio) return mudanca.condominio.name;
    return "Entidade não identificada";
  };

  const getEntidadeTipo = (mudanca: MudancaPendente): string => {
    if (mudanca.ministry) return "Ministério";
    if (mudanca.casa_refugio) return "Casa Refúgio";
    if (mudanca.condominio) return "Condomínio";
    return "";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  if (mudancas.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma aprovação pendente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="text-sm">
          {mudancas.length} pendente{mudancas.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {mudancas.map((mudanca) => (
        <Card key={mudanca.id} className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Badge
                    variant={
                      mudanca.acao === "adicionar"
                        ? "default"
                        : mudanca.acao === "alterar"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {acaoLabels[mudanca.acao]}
                  </Badge>
                  <span>{tipoMudancaLabels[mudanca.tipo_mudanca]}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {getEntidadeTipo(mudanca)}: <strong>{getEntidadeNome(mudanca)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {format(new Date(mudanca.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Membro:</span>
                <p className="font-medium">{mudanca.membro?.full_name || "—"}</p>
              </div>
              {mudanca.membro_atual && (
                <div>
                  <span className="text-muted-foreground">Substituindo:</span>
                  <p className="font-medium">{mudanca.membro_atual.full_name}</p>
                </div>
              )}
              {mudanca.funcao && (
                <div>
                  <span className="text-muted-foreground">Função:</span>
                  <p className="font-medium">{mudanca.funcao.nome}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Solicitado por:</span>
                <p className="font-medium">{mudanca.solicitante?.full_name || "Sistema"}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleAprovar(mudanca.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => handleRejeitar(mudanca.id)}
                disabled={isProcessing}
              >
                <X className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog de confirmação de aprovação */}
      <AlertDialog open={!!approvingId} onOpenChange={() => setApprovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar aprovação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar esta mudança? A alteração será aplicada imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAprovacao}
              className="bg-green-600 hover:bg-green-700"
            >
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de rejeição */}
      <Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição (opcional):
            </p>
            <Textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarRejeicao}>
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AprovacoesPendentesTab;
