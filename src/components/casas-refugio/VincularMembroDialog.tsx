import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { includesNormalized } from "@/lib/text-utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, User, AlertTriangle, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMudancasPendentes, getAprovadorId } from "@/hooks/useMudancasPendentes";

interface VincularMembroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casaRefugioId: string;
  casaRefugioName: string;
  solicitanteId?: string;
}

interface MembroComConflito {
  id: string;
  full_name: string;
  photo_url: string | null;
  whatsapp: string | null;
  email: string | null;
  casa_refugio_id: string | null;
  casa_refugio?: { name: string } | null;
  funcoes: { function_type: string; casa_refugio_id: string | null }[];
}

export const VincularMembroDialog = ({
  open,
  onOpenChange,
  casaRefugioId,
  casaRefugioName,
  solicitanteId,
}: VincularMembroDialogProps) => {
  const [search, setSearch] = useState("");
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [conflictMember, setConflictMember] = useState<MembroComConflito | null>(null);
  const [conflictMessage, setConflictMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createMudanca, isCreating } = useMudancasPendentes();

  // Fetch ALL members (not just unlinked)
  const { data: membrosDisponiveis = [], isLoading } = useQuery({
    queryKey: ["membros-vincular-todos", search],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id, full_name, photo_url, whatsapp, email, casa_refugio_id")
        .order("full_name");

      // Fetch more results and filter client-side for accent-insensitive search
      const { data, error } = await query.limit(2000);
      if (error) throw error;

      // Filter client-side using normalized search
      let filtered = data || [];
      if (search.trim()) {
        filtered = filtered.filter((m) => includesNormalized(m.full_name, search.trim()));
      }
      filtered = filtered.slice(0, 50);

      // Fetch member functions for conflict detection
      const memberIds = filtered.map((m) => m.id);
      if (memberIds.length === 0) return [];

      const { data: funcoes } = await supabase
        .from("member_functions")
        .select("member_id, function_type, casa_refugio_id")
        .in("member_id", memberIds);

      // Fetch casa refugio names for members already linked
      const casaIds = filtered
        .filter((m) => m.casa_refugio_id)
        .map((m) => m.casa_refugio_id!)
        .filter((id, i, arr) => arr.indexOf(id) === i);

      let casasMap: Record<string, string> = {};
      if (casaIds.length > 0) {
        const { data: casas } = await supabase
          .from("casas_refugio")
          .select("id, name")
          .in("id", casaIds);
        casas?.forEach((c) => (casasMap[c.id] = c.name));
      }

      return filtered.map((m) => ({
        ...m,
        casa_refugio: m.casa_refugio_id ? { name: casasMap[m.casa_refugio_id] || "Outra casa" } : null,
        funcoes: (funcoes || []).filter((f) => f.member_id === m.id),
      })) as MembroComConflito[];
    },
    enabled: open,
  });

  // Already linked to THIS casa
  const { data: membrosJaVinculados = [] } = useQuery({
    queryKey: ["membros-casa-ids", casaRefugioId],
    queryFn: async () => {
      const { data } = await supabase
        .from("members")
        .select("id")
        .eq("casa_refugio_id", casaRefugioId);
      return data?.map((m) => m.id) || [];
    },
    enabled: open,
  });

  const getConflicts = (membro: MembroComConflito): string[] => {
    const conflicts: string[] = [];

    // Already linked to another casa
    if (membro.casa_refugio_id && membro.casa_refugio_id !== casaRefugioId) {
      conflicts.push(`Já está vinculado à Casa Refúgio "${membro.casa_refugio?.name || "outra"}"`);
    }

    // Leadership roles (supervisor, líder, síndico) are now allowed to accumulate
    // No conflicts generated for these roles

    return conflicts;
  };

  const handleVincular = async (membro: MembroComConflito) => {
    const conflicts = getConflicts(membro);
    const isAlreadyLinked = membrosJaVinculados.includes(membro.id);

    if (isAlreadyLinked) {
      toast({
        variant: "destructive",
        title: "Membro já vinculado",
        description: `${membro.full_name} já está vinculado a esta Casa Refúgio.`,
      });
      return;
    }

    if (conflicts.length > 0) {
      setConflictMember(membro);
      setConflictMessage(conflicts.join(". ") + ".");
      return;
    }

    // No conflicts and no existing casa - link directly if has no casa, or request approval
    if (membro.casa_refugio_id) {
      // Has existing casa - need approval
      setConflictMember(membro);
      setConflictMessage(`Já está vinculado à Casa Refúgio "${membro.casa_refugio?.name || "outra"}".`);
      return;
    }

    await doVincular(membro);
  };

  const doVincular = async (membro: MembroComConflito) => {
    setIsLinking(membro.id);
    try {
      const { error } = await supabase
        .from("members")
        .update({ casa_refugio_id: casaRefugioId })
        .eq("id", membro.id);

      if (error) throw error;

      toast({
        title: "Membro vinculado!",
        description: `${membro.full_name} foi vinculado à ${casaRefugioName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["membros-casa", casaRefugioId] });
      queryClient.invalidateQueries({ queryKey: ["membros-vincular-todos"] });
      queryClient.invalidateQueries({ queryKey: ["membros-casa-ids", casaRefugioId] });
      queryClient.invalidateQueries({ queryKey: ["membros-vinculados-stats-portal", casaRefugioId] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao vincular",
        description: error.message,
      });
    } finally {
      setIsLinking(null);
    }
  };

  const handleRequestApproval = async () => {
    if (!conflictMember || !solicitanteId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível identificar o solicitante.",
      });
      setConflictMember(null);
      return;
    }

    setIsLinking(conflictMember.id);
    try {
      // Get the supervisor of this casa refugio as the approver
      const aprovadorId = await getAprovadorForVinculacao(casaRefugioId);

      if (!aprovadorId) {
        toast({
          variant: "destructive",
          title: "Aprovador não encontrado",
          description: "Não foi possível identificar o supervisor/aprovador para esta solicitação.",
        });
        return;
      }

      createMudanca({
        solicitante_id: solicitanteId,
        aprovador_id: aprovadorId,
        tipo_mudanca: "vincular_membro_casa_refugio",
        acao: "adicionar",
        casa_refugio_id: casaRefugioId,
        membro_id: conflictMember.id,
      });

      setConflictMember(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao solicitar aprovação",
        description: error.message,
      });
    } finally {
      setIsLinking(null);
    }
  };

  // Determine approver: Líder -> Supervisor, Supervisor -> Síndico, Síndico -> Pastor
  const getAprovadorForVinculacao = async (casaId: string): Promise<string | null> => {
    const { data: casa } = await supabase
      .from("casas_refugio")
      .select("supervisor_id, condominio")
      .eq("id", casaId)
      .single();

    if (!casa) return null;

    // If solicitante is the leader, supervisor approves
    if (casa.supervisor_id) return casa.supervisor_id;

    // Fallback: get sindico of condominio
    if (casa.condominio) {
      const { data: cond } = await supabase
        .from("condominios")
        .select("sindico_id")
        .eq("name", casa.condominio)
        .single();
      if (cond?.sindico_id) return cond.sindico_id;
    }

    // Fallback: pastor geral
    const { data: pastor } = await supabase
      .from("member_functions")
      .select("member_id")
      .eq("function_type", "pastor_geral")
      .limit(1)
      .single();
    return pastor?.member_id || null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-destructive" />
              Vincular Membro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <SearchInput
              placeholder="Buscar membro pelo nome..."
              value={search}
              onChange={setSearch}
            />

            <p className="text-xs text-muted-foreground">
              Busque e vincule membros à <strong>{casaRefugioName}</strong>. Membros com conflitos precisarão de aprovação.
            </p>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-destructive animate-spin" />
                </div>
              ) : membrosDisponiveis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {search ? "Nenhum membro encontrado" : "Nenhum membro disponível"}
                </div>
              ) : (
                membrosDisponiveis.map((membro) => {
                  const isAlreadyHere = membrosJaVinculados.includes(membro.id);
                  const conflicts = getConflicts(membro);
                  const hasConflict = conflicts.length > 0 || (membro.casa_refugio_id && membro.casa_refugio_id !== casaRefugioId);

                  return (
                    <div
                      key={membro.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isAlreadyHere
                          ? "bg-muted/30 opacity-60"
                          : hasConflict
                          ? "bg-amber-500/5 border border-amber-500/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={membro.photo_url || undefined} alt={membro.full_name} />
                          <AvatarFallback className={hasConflict ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}>
                            {hasConflict ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              membro.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{membro.full_name}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              {membro.whatsapp || membro.email || "Sem contato"}
                            </p>
                            {isAlreadyHere && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Já vinculado
                              </Badge>
                            )}
                            {!isAlreadyHere && membro.casa_refugio_id && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-700">
                                <Home className="w-3 h-3 mr-0.5" />
                                {membro.casa_refugio?.name || "Outra CR"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={hasConflict && !isAlreadyHere ? "outline" : "secondary"}
                        onClick={() => handleVincular(membro)}
                        disabled={isLinking === membro.id || isAlreadyHere || isCreating}
                        className="flex-shrink-0 ml-2"
                      >
                        {isLinking === membro.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isAlreadyHere ? (
                          "Vinculado"
                        ) : hasConflict ? (
                          "Solicitar"
                        ) : (
                          "Vincular"
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirmation Dialog */}
      <AlertDialog open={!!conflictMember} onOpenChange={() => setConflictMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Conflito Detectado
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong>{conflictMember?.full_name}</strong> possui impedimento(s):
              </p>
              <p className="text-amber-700 font-medium">{conflictMessage}</p>
              <p>
                Deseja enviar uma solicitação de aprovação para vincular este membro à{" "}
                <strong>{casaRefugioName}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                A solicitação será enviada ao gestor responsável na cadeia de aprovação.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRequestApproval}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Solicitar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
