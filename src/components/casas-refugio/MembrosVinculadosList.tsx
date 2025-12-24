import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, UserMinus, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface MembrosVinculadosListProps {
  casaRefugioId: string;
  onVincularClick: () => void;
}

export const MembrosVinculadosList = ({
  casaRefugioId,
  onVincularClick,
}: MembrosVinculadosListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [desvincularMembro, setDesvincularMembro] = useState<{ id: string; nome: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: membros = [], isLoading } = useQuery({
    queryKey: ["membros-casa", casaRefugioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, email, photo_url")
        .eq("casa_refugio_id", casaRefugioId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!casaRefugioId,
  });

  const handleDesvincular = async () => {
    if (!desvincularMembro) return;

    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({ casa_refugio_id: null })
        .eq("id", desvincularMembro.id);

      if (error) throw error;

      toast({
        title: "Membro desvinculado",
        description: `${desvincularMembro.nome} foi desvinculado da Casa Refúgio`,
      });

      queryClient.invalidateQueries({ queryKey: ["membros-casa", casaRefugioId] });
      queryClient.invalidateQueries({ queryKey: ["membros-disponiveis"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao desvincular",
        description: error.message,
      });
    } finally {
      setIsRemoving(false);
      setDesvincularMembro(null);
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Membros Vinculados ({membros.length})
            </CardTitle>
            <Button size="sm" variant="secondary" onClick={onVincularClick}>
              <UserPlus className="w-4 h-4 mr-2" />
              Vincular
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-destructive animate-spin" />
            </div>
          ) : membros.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Nenhum membro vinculado a esta Casa Refúgio
            </div>
          ) : (
            <div className="space-y-2">
              {membros.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/membro/${membro.id}`)}
                  >
                    {membro.photo_url ? (
                      <img
                        src={membro.photo_url}
                        alt={membro.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm text-foreground">{membro.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {membro.whatsapp || membro.email || "Sem contato"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDesvincularMembro({ id: membro.id, nome: membro.full_name })}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!desvincularMembro} onOpenChange={() => setDesvincularMembro(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desvincular <strong>{desvincularMembro?.nome}</strong> desta Casa Refúgio?
              O membro poderá ser vinculado a outra Casa Refúgio posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDesvincular}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
