import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { includesNormalized } from "@/lib/text-utils";
import { formatNameField } from "@/lib/text-utils";

interface InscricaoRapidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventoId: string;
  eventoTitulo: string;
}

const InscricaoRapidaDialog = ({ open, onOpenChange, eventoId, eventoTitulo }: InscricaoRapidaDialogProps) => {
  const queryClient = useQueryClient();
  const [isManual, setIsManual] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, genero, cpf, casa_refugio_id")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredMembers = search.length >= 2
    ? members?.filter((m) => includesNormalized(m.full_name, search)).slice(0, 10)
    : [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (isManual) {
        if (!manualName.trim()) throw new Error("Nome é obrigatório");
        const { error } = await supabase.from("inscricoes_eventos").insert({
          evento_id: eventoId,
          nome_participante: formatNameField(manualName),
          telefone_contato: manualPhone || "N/A",
        });
        if (error) throw error;
      } else {
        if (!selectedMember) throw new Error("Selecione um membro");
        const { error } = await supabase.from("inscricoes_eventos").insert({
          evento_id: eventoId,
          member_id: selectedMember.id,
          nome_participante: selectedMember.full_name,
          telefone_contato: selectedMember.whatsapp || "N/A",
          genero: selectedMember.genero || null,
          cpf: selectedMember.cpf || null,
          casa_refugio_id: selectedMember.casa_refugio_id || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Inscrição realizada!");
      queryClient.invalidateQueries({ queryKey: ["inscricoes-eventos-count"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes-evento"] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao realizar inscrição");
    },
  });

  const resetForm = () => {
    setSearch("");
    setSelectedMember(null);
    setManualName("");
    setManualPhone("");
    setIsManual(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrição Rápida — {eventoTitulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="manual"
              checked={isManual}
              onCheckedChange={(v) => {
                setIsManual(!!v);
                setSelectedMember(null);
                setSearch("");
              }}
            />
            <Label htmlFor="manual" className="cursor-pointer text-sm">
              Visitante (não é membro)
            </Label>
          </div>

          {isManual ? (
            <>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Nome completo"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Buscar membro *</Label>
              <SearchInput
                placeholder="Digite o nome..."
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setSelectedMember(null);
                }}
              />
              {filteredMembers && filteredMembers.length > 0 && !selectedMember && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                      onClick={() => {
                        setSelectedMember(m);
                        setSearch(m.full_name);
                      }}
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
              {selectedMember && (
                <div className="p-3 bg-secondary/10 rounded-lg text-sm">
                  <p className="font-medium">{selectedMember.full_name}</p>
                  {selectedMember.whatsapp && (
                    <p className="text-muted-foreground">{selectedMember.whatsapp}</p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Salvando..." : "Inscrever"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InscricaoRapidaDialog;
