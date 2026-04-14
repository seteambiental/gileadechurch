import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

interface FinalizarEventoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  eventoNome: string;
  onFinalized?: () => void;
}

const FinalizarEventoDialog = ({ open, onOpenChange, eventoId, eventoNome, onFinalized }: FinalizarEventoDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinalizar = async () => {
    if (!password.trim()) {
      toast.error("Digite sua senha para confirmar.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("finalizar-evento", {
        body: {
          evento_id: eventoId,
          email: user?.email,
          password,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Evento finalizado e arquivado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["impacto-eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["impacto-eventos-financeiro"] });
      await queryClient.invalidateQueries({ queryKey: ["impacto-eventos-finalizados"] });
      await queryClient.invalidateQueries({ queryKey: ["agenda-eventos-inscricao-for-impacto"] });
      await queryClient.invalidateQueries({ queryKey: ["agenda-eventos-financeiro"] });
      await queryClient.invalidateQueries({ queryKey: ["impacto-eventos-finalizados-ids"] });
      onOpenChange(false);
      setPassword("");
    } catch (err: any) {
      console.error("Erro ao finalizar evento:", err);
      toast.error(err.message || "Erro ao finalizar evento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setPassword(""); } onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Finalizar Evento
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span>
              Você está finalizando o evento <strong>"{eventoNome}"</strong>. 
              Ele será movido para a aba de Eventos Finalizados e não aparecerá mais nas listagens ativas.
            </span>
            <span className="block text-destructive font-medium">
              Esta ação não pode ser desfeita.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2">
          <Label htmlFor="finalize-password">Confirme sua senha</Label>
          <Input
            id="finalize-password"
            type="password"
            placeholder="Digite sua senha..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleFinalizar(); }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button onClick={handleFinalizar} disabled={loading} variant="destructive">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Finalizar Evento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default FinalizarEventoDialog;
