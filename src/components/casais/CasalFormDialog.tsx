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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatPhone } from "@/lib/masks";

interface CasalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string;
}

export function CasalFormDialog({ open, onOpenChange, turmaId }: CasalFormDialogProps) {
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

  const membrosMasculinos = membros?.filter((m) => m.genero?.toLowerCase() === "masculino" || !m.genero);
  const membrosFemininos = membros?.filter((m) => m.genero?.toLowerCase() === "feminino" || !m.genero);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      turma_id: turmaId,
      membro_masculino_id: usarMembros && membroMasculinoId ? membroMasculinoId : null,
      membro_feminino_id: usarMembros && membroFemininoId ? membroFemininoId : null,
      nome_masculino: !usarMembros ? nomeMasculino : null,
      nome_feminino: !usarMembros ? nomeFeminino : null,
      whatsapp_masculino: !usarMembros ? whatsappMasculino : null,
      whatsapp_feminino: !usarMembros ? whatsappFeminino : null,
      data_casamento: dataCasamento || null,
      tempo_casamento: tempoCasamento || null,
      observacoes: observacoes || null,
    };

    const { error } = await supabase.from("casais_inscritos").insert(payload);

    if (error) {
      toast({ title: "Erro ao inscrever casal", variant: "destructive" });
    } else {
      toast({ title: "Casal inscrito com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
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
          <DialogTitle>Adicionar Casal</DialogTitle>
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
                <Label>Esposo *</Label>
                <Select value={membroMasculinoId} onValueChange={setMembroMasculinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o esposo" />
                  </SelectTrigger>
                  <SelectContent>
                    {membrosMasculinos?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Esposa *</Label>
                <Select value={membroFemininoId} onValueChange={setMembroFemininoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a esposa" />
                  </SelectTrigger>
                  <SelectContent>
                    {membrosFemininos?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeMasculino">Nome do Esposo *</Label>
                  <Input
                    id="nomeMasculino"
                    value={nomeMasculino}
                    onChange={(e) => setNomeMasculino(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappMasculino">WhatsApp Esposo</Label>
                  <Input
                    id="whatsappMasculino"
                    value={whatsappMasculino}
                    onChange={(e) => setWhatsappMasculino(formatPhone(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeFeminino">Nome da Esposa *</Label>
                  <Input
                    id="nomeFeminino"
                    value={nomeFeminino}
                    onChange={(e) => setNomeFeminino(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappFeminino">WhatsApp Esposa</Label>
                  <Input
                    id="whatsappFeminino"
                    value={whatsappFeminino}
                    onChange={(e) => setWhatsappFeminino(formatPhone(e.target.value))}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataCasamento">Data do Casamento</Label>
              <Input
                id="dataCasamento"
                type="date"
                value={dataCasamento}
                onChange={(e) => setDataCasamento(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempoCasamento">Tempo de Casamento</Label>
              <Input
                id="tempoCasamento"
                value={tempoCasamento}
                onChange={(e) => setTempoCasamento(e.target.value)}
                placeholder="Ex: 5 anos"
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
            <Button type="submit">Inscrever Casal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
