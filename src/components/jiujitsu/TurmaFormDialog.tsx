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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

const CATEGORIAS = ["Kids (6-9)", "Juvenil (10-13)", "Adulto (14+)"];
const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turma?: any;
}

export function TurmaFormDialog({ open, onOpenChange, turma }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!turma;

  const [nome, setNome] = useState("");
  const [categoriaIdade, setCategoriaIdade] = useState("Kids (6-9)");
  const [faixaMinima, setFaixaMinima] = useState("Branca");
  const [faixaMaxima, setFaixaMaxima] = useState("Preta");
  const [diaSemana, setDiaSemana] = useState("");
  const [horario, setHorario] = useState("");
  const [liderBusca, setLiderBusca] = useState("");
  const [liderId, setLiderId] = useState<string | null>(null);
  const [liderNome, setLiderNome] = useState("");

  const { data: membersLider = [] } = useQuery({
    queryKey: ["members_busca_turma_lider", liderBusca],
    enabled: liderBusca.length >= 3 && !liderId,
    queryFn: async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, full_name")
        .ilike("full_name", `%${liderBusca}%`)
        .limit(10);
      return (data || []) as any[];
    },
  });

  useEffect(() => {
    if (turma) {
      setNome(turma.nome || "");
      setCategoriaIdade(turma.categoria_idade || "Kids (6-9)");
      setFaixaMinima(turma.faixa_minima || "Branca");
      setFaixaMaxima(turma.faixa_maxima || "Preta");
      setDiaSemana(turma.dia_semana || "");
      setHorario(turma.horario || "");
      setLiderId(turma.lider_id || null);
      setLiderNome(turma.lider_nome || "");
      setLiderBusca(turma.lider_nome || "");
    } else {
      resetForm();
    }
  }, [turma, open]);

  const resetForm = () => {
    setNome(""); setCategoriaIdade("Kids (4-15)"); setFaixaMinima("Branca");
    setFaixaMaxima("Preta"); setDiaSemana(""); setHorario("");
    setLiderId(null); setLiderNome(""); setLiderBusca("");
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const payload: any = {
      nome: nome.trim(),
      categoria_idade: categoriaIdade,
      faixa_minima: faixaMinima,
      faixa_maxima: faixaMaxima,
      dia_semana: diaSemana || null,
      horario: horario || null,
      lider_id: liderId,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("jiujitsu_turmas").update(payload).eq("id", turma.id));
    } else {
      ({ error } = await supabase.from("jiujitsu_turmas").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar turma", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEditing ? "Turma atualizada!" : "Turma criada!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_turmas_com_alunos"] });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_turmas_ativas"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome da Turma *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Kids Iniciante" />
          </div>

          <div>
            <Label>Categoria por Idade</Label>
            <Select value={categoriaIdade} onValueChange={setCategoriaIdade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faixa Mínima</Label>
              <Select value={faixaMinima} onValueChange={setFaixaMinima}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAIXAS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Faixa Máxima</Label>
              <Select value={faixaMaxima} onValueChange={setFaixaMaxima}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAIXAS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia da Semana</Label>
              <Select value={diaSemana} onValueChange={setDiaSemana}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horário</Label>
              <Input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="Ex: 19:00" />
            </div>
          </div>

          <div>
            <Label>Líder da Turma</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar líder..."
                value={liderBusca}
                onChange={(e) => { setLiderBusca(e.target.value); setLiderId(null); setLiderNome(""); }}
                className="pl-9"
              />
            </div>
            {membersLider.length > 0 && liderBusca.length >= 3 && !liderId && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                {membersLider.map((m: any) => (
                  <button
                    key={m.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => { setLiderId(m.id); setLiderNome(m.full_name); setLiderBusca(m.full_name); }}
                  >
                    {m.full_name}
                  </button>
                ))}
              </div>
            )}
            {liderId && (
              <p className="text-sm text-green-600 mt-1">✓ Líder: {liderNome}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{isEditing ? "Salvar" : "Criar Turma"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
