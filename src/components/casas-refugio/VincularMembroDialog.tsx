import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, User } from "lucide-react";
import { includesNormalized } from "@/lib/text-utils";

interface VincularMembroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  casaRefugioId: string;
  casaRefugioName: string;
}

export const VincularMembroDialog = ({
  open,
  onOpenChange,
  casaRefugioId,
  casaRefugioName,
}: VincularMembroDialogProps) => {
  const [search, setSearch] = useState("");
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch members without a casa refugio
  const { data: membrosDisponiveis = [], isLoading } = useQuery({
    queryKey: ["membros-disponiveis", search],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id, full_name, whatsapp, email")
        .is("casa_refugio_id", null)
        .order("full_name");

      if (search.trim()) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleVincular = async (membroId: string, membroNome: string) => {
    setIsLinking(membroId);
    try {
      const { error } = await supabase
        .from("members")
        .update({ casa_refugio_id: casaRefugioId })
        .eq("id", membroId)
        .is("casa_refugio_id", null); // Extra check to ensure not already linked

      if (error) throw error;

      toast({
        title: "Membro vinculado!",
        description: `${membroNome} foi vinculado à ${casaRefugioName}`,
      });

      queryClient.invalidateQueries({ queryKey: ["membros-casa", casaRefugioId] });
      queryClient.invalidateQueries({ queryKey: ["membros-disponiveis"] });
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

  return (
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
            Apenas membros sem Casa Refúgio vinculada são exibidos. Para cadastrar um novo membro, acesse <strong>Cadastros → Membros</strong>.
          </p>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-destructive animate-spin" />
              </div>
            ) : membrosDisponiveis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {search ? "Nenhum membro encontrado" : "Nenhum membro disponível para vincular"}
              </div>
            ) : (
              membrosDisponiveis.map((membro) => (
                <div
                  key={membro.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{membro.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {membro.whatsapp || membro.email || "Sem contato"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleVincular(membro.id, membro.full_name)}
                    disabled={isLinking === membro.id}
                  >
                    {isLinking === membro.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Vincular"
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
