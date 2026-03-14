import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InscricaoJiuJitsuFormDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tipoInscricao, setTipoInscricao] = useState<string>("visitante");
  const [membroBusca, setMembroBusca] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["members_busca_jiujitsu_insc", membroBusca],
    enabled: tipoInscricao === "membro" && membroBusca.length >= 3,
    queryFn: async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, full_name, whatsapp, birth_date")
        .ilike("full_name", `%${membroBusca}%`)
        .limit(10);
      return (data || []) as any[];
    },
  });

  const resetForm = () => {
    setNome(""); setDataNascimento(""); setWhatsapp(""); setEmail("");
    setCpf(""); setObservacoes(""); setSelectedMemberId(null);
    setMembroBusca(""); setTipoInscricao("visitante");
  };

  const handleSelectMembro = (member: any) => {
    setSelectedMemberId(member.id);
    setNome(member.full_name);
    setWhatsapp(member.whatsapp || "");
    setDataNascimento(member.birth_date || "");
    setMembroBusca(member.full_name);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("jiujitsu_inscricoes").insert({
      nome: nome.trim(),
      data_nascimento: dataNascimento || null,
      whatsapp: whatsapp || null,
      email: email || null,
      cpf: cpf || null,
      tipo: tipoInscricao,
      member_id: selectedMemberId,
      observacoes: observacoes || null,
      status: "pendente",
    });

    if (error) {
      toast({ title: "Erro ao registrar inscrição", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Inscrição registrada!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_inscricoes"] });
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Inscrição</DialogTitle>
        </DialogHeader>

        <Tabs value={tipoInscricao} onValueChange={(v) => { resetForm(); setTipoInscricao(v); }}>
          <TabsList className="w-full">
            <TabsTrigger value="membro" className="flex-1">Membro da Igreja</TabsTrigger>
            <TabsTrigger value="visitante" className="flex-1">Visitante</TabsTrigger>
          </TabsList>

          <TabsContent value="membro" className="mt-4 space-y-3">
            <div>
              <Label>Buscar Membro</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do membro..."
                  value={membroBusca}
                  onChange={(e) => { setMembroBusca(e.target.value); setSelectedMemberId(null); }}
                  className="pl-9"
                />
              </div>
              {members.length > 0 && membroBusca.length >= 3 && !selectedMemberId && (
                <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                  {members.map((m: any) => (
                    <button
                      key={m.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => handleSelectMembro(m)}
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
              {selectedMemberId && (
                <p className="text-sm text-green-600 mt-1">✓ Membro selecionado: {nome}</p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="visitante" />
        </Tabs>

        <div className="space-y-3 mt-2">
          {tipoInscricao === "visitante" && (
            <>
              <div>
                <Label>Nome Completo *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div>
            <Label>Observações</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Informações adicionais..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Registrar Inscrição</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
