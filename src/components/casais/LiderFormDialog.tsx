import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClearableSelect } from "@/components/ui/clearable-select";

interface LiderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
}

export function LiderFormDialog({ open, onOpenChange, turmaId }: LiderFormDialogProps) {
  const [membroMasculinoId, setMembroMasculinoId] = useState("");
  const [membroFemininoId, setMembroFemininoId] = useState("");
  const [funcao, setFuncao] = useState("lider");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: membros } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, genero")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const membrosMasculinos = membros?.filter((m) => m.genero?.toLowerCase() === "masculino" || !m.genero);
  const membrosFemininos = membros?.filter((m) => m.genero?.toLowerCase() === "feminino" || !m.genero);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!membroMasculinoId && !membroFemininoId) {
      toast({ title: "Selecione pelo menos um membro", variant: "destructive" });
      return;
    }

    const payload = {
      turma_id: turmaId,
      membro_masculino_id: membroMasculinoId || null,
      membro_feminino_id: membroFemininoId || null,
      funcao,
    };

    const { error } = await supabase.from("casais_lideres").insert(payload);

    if (error) {
      toast({ title: "Erro ao adicionar líder", variant: "destructive" });
    } else {
      toast({ title: "Líder adicionado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_lideres"] });
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setMembroMasculinoId("");
    setMembroFemininoId("");
    setFuncao("lider");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Líder</DialogTitle>
          <DialogDescription>
            Selecione o esposo e/ou a esposa e informe a função.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Esposo</Label>
            <ClearableSelect
              value={membroMasculinoId || null}
              onChange={(val) => setMembroMasculinoId(val || "")}
              options={(membrosMasculinos || []).map((m) => ({
                value: m.id,
                label: m.full_name,
              }))}
              placeholder="Selecione o esposo"
              emptyLabel="Nenhum"
            />
          </div>

          <div className="space-y-2">
            <Label>Esposa</Label>
            <ClearableSelect
              value={membroFemininoId || null}
              onChange={(val) => setMembroFemininoId(val || "")}
              options={(membrosFemininos || []).map((m) => ({
                value: m.id,
                label: m.full_name,
              }))}
              placeholder="Selecione a esposa"
              emptyLabel="Nenhum"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funcao">Função</Label>
            <Input
              id="funcao"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              placeholder="Ex: Líder, Facilitador"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
