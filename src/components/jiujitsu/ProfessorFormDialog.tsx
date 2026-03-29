import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const FUNCOES = [
  { value: "professor", label: "Professor" },
  { value: "auxiliar", label: "Auxiliar" },
];

const FAIXAS_ETARIAS = [
  { value: "6-9", label: "6 a 9 anos" },
  { value: "10-13", label: "10 a 13 anos" },
  { value: "14+", label: "14 anos acima" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor?: any;
}

export function ProfessorFormDialog({ open, onOpenChange, professor }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!professor;

  const [nome, setNome] = useState("");
  const [funcao, setFuncao] = useState("professor");
  const [faixaEtaria, setFaixaEtaria] = useState("6-9");
  const [turmaId, setTurmaId] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [membroBusca, setMembroBusca] = useState("");
  const [memberId, setMemberId] = useState<string | null>(null);
  const [membroNome, setMembroNome] = useState("");

  const { data: membersSearch = [] } = useQuery({
    queryKey: ["members_busca_professor", membroBusca],
    enabled: membroBusca.length >= 3 && !memberId,
    queryFn: async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, full_name")
        .ilike("full_name", `%${membroBusca}%`)
        .limit(10);
      return (data || []) as any[];
    },
  });

  // Buscar turmas ativas filtradas pela faixa etária selecionada
  const { data: turmasDisponiveis = [] } = useQuery({
    queryKey: ["jiujitsu_turmas_por_faixa", faixaEtaria],
    queryFn: async () => {
      const { data } = await supabase
        .from("jiujitsu_turmas")
        .select("id, nome, categoria_idade")
        .eq("ativo", true)
        .order("nome");
      return (data || []) as any[];
    },
  });

  useEffect(() => {
    if (professor) {
      setNome(professor.nome || "");
      setFuncao(professor.funcao || "professor");
      setFaixaEtaria(professor.faixa_etaria || "6-9");
      setTurmaId(professor.turma_id || null);
      setObservacoes(professor.observacoes || "");
      setMemberId(professor.member_id || null);
      setMembroNome(professor.membro_nome || "");
      setMembroBusca(professor.membro_nome || "");
    } else {
      resetForm();
    }
  }, [professor, open]);

  const resetForm = () => {
    setNome("");
    setFuncao("professor");
    setFaixaEtaria("6-9");
    setTurmaId(null);
    setObservacoes("");
    setMemberId(null);
    setMembroNome("");
    setMembroBusca("");
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const payload = {
      nome: nome.trim(),
      funcao,
      faixa_etaria: faixaEtaria,
      turma_id: turmaId,
      member_id: memberId,
      observacoes: observacoes.trim() || null,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("jiujitsu_professores").update(payload).eq("id", professor.id));
    } else {
      ({ error } = await supabase.from("jiujitsu_professores").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEditing ? "Atualizado com sucesso!" : "Cadastrado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_professores"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Professor/Auxiliar" : "Novo Professor/Auxiliar"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Vincular a membro */}
          <div>
            <Label>Vincular a Membro (opcional)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar membro..."
                value={membroBusca}
                onChange={(e) => {
                  setMembroBusca(e.target.value);
                  setMemberId(null);
                  setMembroNome("");
                }}
                className="pl-9"
              />
            </div>
            {membersSearch.length > 0 && membroBusca.length >= 3 && !memberId && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                {membersSearch.map((m: any) => (
                  <button
                    key={m.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => {
                      setMemberId(m.id);
                      setMembroNome(m.full_name);
                      setMembroBusca(m.full_name);
                      if (!nome.trim()) setNome(m.full_name);
                    }}
                  >
                    {m.full_name}
                  </button>
                ))}
              </div>
            )}
            {memberId && (
              <p className="text-sm text-green-600 mt-1">✓ Vinculado: {membroNome}</p>
            )}
          </div>

          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do professor/auxiliar" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Função *</Label>
              <Select value={funcao} onValueChange={setFuncao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNCOES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Faixa Etária *</Label>
              <Select value={faixaEtaria} onValueChange={(v) => { setFaixaEtaria(v); setTurmaId(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAIXAS_ETARIAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Turma (opcional)</Label>
            <Select value={turmaId || "none"} onValueChange={(v) => setTurmaId(v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione uma turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem turma específica</SelectItem>
                {turmasDisponiveis.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome} ({t.categoria_idade})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações sobre o professor/auxiliar..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{isEditing ? "Salvar" : "Cadastrar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
