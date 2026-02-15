import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AmbienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambiente?: any;
}

const RECURSOS_SUGERIDOS = ["Projetor", "TV", "Quadro Branco", "Ar Condicionado", "Microfone", "Caixa de Som", "Mesa", "Cadeiras"];

export const AmbienteFormDialog = ({ open, onOpenChange, ambiente }: AmbienteFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [recursos, setRecursos] = useState<string[]>([]);
  const [novoRecurso, setNovoRecurso] = useState("");

  useEffect(() => {
    if (ambiente) {
      setNome(ambiente.nome || "");
      setDescricao(ambiente.descricao || "");
      setCapacidade(ambiente.capacidade?.toString() || "");
      setFotoUrl(ambiente.foto_url || "");
      setRecursos(ambiente.recursos || []);
    } else {
      setNome(""); setDescricao(""); setCapacidade(""); setFotoUrl(""); setRecursos([]);
    }
  }, [ambiente, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome,
        descricao: descricao || null,
        capacidade: capacidade ? parseInt(capacidade) : null,
        foto_url: fotoUrl || null,
        recursos: recursos.length > 0 ? recursos : null,
      };
      if (ambiente?.id) {
        const { error } = await supabase.from("ambientes").update(payload).eq("id", ambiente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ambientes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: ambiente ? "Ambiente atualizado!" : "Ambiente criado!" });
      queryClient.invalidateQueries({ queryKey: ["ambientes"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const addRecurso = (r: string) => {
    const trimmed = r.trim();
    if (trimmed && !recursos.includes(trimmed)) setRecursos([...recursos, trimmed]);
    setNovoRecurso("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ambiente ? "Editar Ambiente" : "Novo Ambiente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Sala de Reunião 1" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes sobre o ambiente" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Capacidade (pessoas)</Label>
              <Input type="number" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} placeholder="Ex: 30" />
            </div>
            <div>
              <Label>URL da Foto</Label>
              <Input value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div>
            <Label>Recursos Disponíveis</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {RECURSOS_SUGERIDOS.filter(r => !recursos.includes(r)).map(r => (
                <Badge key={r} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => addRecurso(r)}>
                  <Plus className="w-3 h-3 mr-1" />{r}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={novoRecurso} onChange={(e) => setNovoRecurso(e.target.value)} placeholder="Outro recurso..."
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRecurso(novoRecurso))} />
              <Button type="button" size="sm" variant="outline" onClick={() => addRecurso(novoRecurso)}>Adicionar</Button>
            </div>
            {recursos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recursos.map(r => (
                  <Badge key={r} variant="secondary">
                    {r}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setRecursos(recursos.filter(x => x !== r))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={!nome.trim() || mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {ambiente ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
