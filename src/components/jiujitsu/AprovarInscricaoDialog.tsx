import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricao: any;
}

export function AprovarInscricaoDialog({ open, onOpenChange, inscricao }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [turmaId, setTurmaId] = useState("");
  const [faixa, setFaixa] = useState("Branca");
  const [saving, setSaving] = useState(false);

  const { data: turmas = [] } = useQuery({
    queryKey: ["jiujitsu_turmas_ativas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("jiujitsu_turmas")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      return (data || []) as any[];
    },
  });

  const handleAprovar = async () => {
    if (!turmaId) {
      toast({ title: "Selecione uma turma", variant: "destructive" });
      return;
    }
    if (!inscricao) return;

    setSaving(true);
    try {
      // 1. Create aluno from inscricao
      const { error: alunoError } = await supabase.from("jiujitsu_alunos").insert({
        nome: inscricao.nome,
        data_nascimento: inscricao.data_nascimento,
        whatsapp: inscricao.whatsapp,
        email: inscricao.email,
        cpf: inscricao.cpf,
        tipo: inscricao.tipo,
        member_id: inscricao.member_id,
        faixa,
        graus: 0,
        turma_id: turmaId,
        ativo: true,
      });

      if (alunoError) throw alunoError;

      // 2. Update inscricao status
      const { error: inscError } = await supabase
        .from("jiujitsu_inscricoes")
        .update({ status: "aprovada", turma_id: turmaId })
        .eq("id", inscricao.id);

      if (inscError) throw inscError;

      toast({ title: `${inscricao.nome} aprovado e adicionado à turma!` });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_inscricoes"] });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_alunos"] });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_turmas_com_alunos"] });
      setTurmaId("");
      setFaixa("Branca");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao aprovar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar Inscrição</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aprovando: <span className="font-medium text-foreground">{inscricao?.nome}</span>
          </p>

          <div>
            <Label>Turma *</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma" />
              </SelectTrigger>
              <SelectContent>
                {turmas.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} — {t.categoria_idade} ({t.dia_semana || "—"} {t.horario || ""})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Faixa Inicial</Label>
            <Select value={faixa} onValueChange={setFaixa}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAIXAS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAprovar} disabled={saving}>
            {saving ? "Aprovando..." : "Aprovar e Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
