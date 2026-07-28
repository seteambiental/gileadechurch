import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { formatPhone } from "@/lib/masks";
import { differenceInYears, differenceInMonths } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { DateInput } from "@/components/ui/date-input";
import { formatNameField } from "@/lib/text-utils";
import { ClearableSelect } from "@/components/ui/clearable-select";

interface CasalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
  casal?: any;
}

function calcularTempoCasamento(dataStr: string): string {
  if (!dataStr) return "";
  const data = parseLocalDate(dataStr);
  const hoje = new Date();
  const anos = differenceInYears(hoje, data);
  const meses = differenceInMonths(hoje, data) % 12;
  
  if (anos === 0 && meses === 0) return "Menos de 1 mês";
  if (anos === 0) return meses === 1 ? "1 mês" : `${meses} meses`;
  if (meses === 0) return anos === 1 ? "1 ano" : `${anos} anos`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

export function CasalFormDialog({ open, onOpenChange, turmaId, casal }: CasalFormDialogProps) {
  const [usarMembros, setUsarMembros] = useState(true);
  const [membroMasculinoId, setMembroMasculinoId] = useState("");
  const [membroFemininoId, setMembroFemininoId] = useState("");
  const [nomeMasculino, setNomeMasculino] = useState("");
  const [nomeFeminino, setNomeFeminino] = useState("");
  const [whatsappMasculino, setWhatsappMasculino] = useState("");
  const [whatsappFeminino, setWhatsappFeminino] = useState("");
  const [dataCasamento, setDataCasamento] = useState("");
  const [tempoCasamento, setTempoCasamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEditing = !!casal;

  useEffect(() => {
    if (casal && open) {
      setUsarMembros(!!(casal.membro_masculino_id || casal.membro_feminino_id));
      setMembroMasculinoId(casal.membro_masculino_id || "");
      setMembroFemininoId(casal.membro_feminino_id || "");
      setNomeMasculino(casal.nome_masculino || "");
      setNomeFeminino(casal.nome_feminino || "");
      setWhatsappMasculino(casal.whatsapp_masculino || "");
      setWhatsappFeminino(casal.whatsapp_feminino || "");
      setDataCasamento(casal.data_casamento || "");
      setTempoCasamento(casal.tempo_casamento || "");
      setObservacoes(casal.observacoes || "");
    } else if (!casal && open) {
      resetForm();
    }
  }, [casal, open]);

  useEffect(() => {
    if (dataCasamento) {
      setTempoCasamento(calcularTempoCasamento(dataCasamento));
    }
  }, [dataCasamento]);

  const { data: membros } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, genero, whatsapp")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const membrosMasculinos = useMemo(() => 
    membros?.filter((m) => !!m?.id && (m.genero?.toLowerCase() === "masculino" || !m.genero)) || []
  , [membros]);

  const membrosFemininos = useMemo(() =>
    membros?.filter((m) => !!m?.id && (m.genero?.toLowerCase() === "feminino" || !m.genero)) || []
  , [membros]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      turma_id: turmaId,
      membro_masculino_id: usarMembros && membroMasculinoId ? membroMasculinoId : null,
      membro_feminino_id: usarMembros && membroFemininoId ? membroFemininoId : null,
      nome_masculino: !usarMembros && nomeMasculino ? formatNameField(nomeMasculino) : null,
      nome_feminino: !usarMembros && nomeFeminino ? formatNameField(nomeFeminino) : null,
      whatsapp_masculino: !usarMembros ? whatsappMasculino : null,
      whatsapp_feminino: !usarMembros ? whatsappFeminino : null,
      data_casamento: dataCasamento || null,
      tempo_casamento: tempoCasamento || null,
      observacoes: observacoes || null,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("casais_inscritos").update(payload).eq("id", casal.id));
    } else {
      ({ error } = await supabase.from("casais_inscritos").insert(payload));
    }

    if (error) {
      toast({ title: isEditing ? "Erro ao atualizar casal" : "Erro ao inscrever casal", variant: "destructive" });
    } else {
      toast({ title: isEditing ? "Casal atualizado com sucesso" : "Casal inscrito com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_all"] });
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setMembroMasculinoId("");
    setMembroFemininoId("");
    setNomeMasculino("");
    setNomeFeminino("");
    setWhatsappMasculino("");
    setWhatsappFeminino("");
    setDataCasamento("");
    setTempoCasamento("");
    setObservacoes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Casal" : "Adicionar Casal"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edite os dados do casal." : "Preencha os dados do casal para inscrevê-los na turma."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label htmlFor="usarMembros">Vincular a membros cadastrados</Label>
            <Switch
              id="usarMembros"
              checked={usarMembros}
              onCheckedChange={setUsarMembros}
            />
          </div>

          {usarMembros ? (
            <>
              <div className="space-y-2">
                <Label>Esposo (membro)</Label>
                <ClearableSelect
                  value={membroMasculinoId}
                  onChange={(v) => setMembroMasculinoId(v || "")}
                  placeholder="Selecione o esposo"
                  options={membrosMasculinos.map((m) => ({
                    value: m.id,
                    label: m.full_name || "",
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Esposa (membro)</Label>
                <ClearableSelect
                  value={membroFemininoId}
                  onChange={(v) => setMembroFemininoId(v || "")}
                  placeholder="Selecione a esposa"
                  options={membrosFemininos.map((m) => ({
                    value: m.id,
                    label: m.full_name || "",
                  }))}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeMasculino">Nome do Esposo</Label>
                  <Input
                    id="nomeMasculino"
                    value={nomeMasculino}
                    onChange={(e) => setNomeMasculino(formatNameField(e.target.value))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappMasculino">WhatsApp Esposo</Label>
                  <Input
                    id="whatsappMasculino"
                    value={whatsappMasculino}
                    onChange={(e) => setWhatsappMasculino(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeFeminino">Nome da Esposa</Label>
                  <Input
                    id="nomeFeminino"
                    value={nomeFeminino}
                    onChange={(e) => setNomeFeminino(formatNameField(e.target.value))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappFeminino">WhatsApp Esposa</Label>
                  <Input
                    id="whatsappFeminino"
                    value={whatsappFeminino}
                    onChange={(e) => setWhatsappFeminino(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Casamento</Label>
              <DateInput
                value={dataCasamento}
                onChange={setDataCasamento}
                placeholder="DD/MM/AAAA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempoCasamento">Tempo de Casamento</Label>
              <Input
                id="tempoCasamento"
                value={tempoCasamento}
                onChange={(e) => setTempoCasamento(e.target.value)}
                placeholder="Calculado automaticamente"
                readOnly={!!dataCasamento}
                className={dataCasamento ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Salvar" : "Inscrever Casal"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
