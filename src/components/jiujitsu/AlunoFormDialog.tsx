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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface AlunoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno?: any;
}

export function AlunoFormDialog({ open, onOpenChange, aluno }: AlunoFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!aluno;

  const [tipoInscricao, setTipoInscricao] = useState<string>("visitante");
  const [membroBusca, setMembroBusca] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contatoEmergenciaNome, setContatoEmergenciaNome] = useState("");
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] = useState("");
  const [tipoSanguineo, setTipoSanguineo] = useState("");
  const [faixa, setFaixa] = useState("Branca");
  const [graus, setGraus] = useState(0);

  const { data: members = [] } = useQuery({
    queryKey: ["members_busca_jiujitsu", membroBusca],
    enabled: tipoInscricao === "membro" && membroBusca.length >= 3,
    queryFn: async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, full_name, photo_url, whatsapp, data_nascimento")
        .ilike("full_name", `%${membroBusca}%`)
        .limit(10);
      return (data || []) as any[];
    },
  });

  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome || "");
      setCpf(aluno.cpf || "");
      setDataNascimento(aluno.data_nascimento || "");
      setEndereco(aluno.endereco || "");
      setTelefone(aluno.telefone || "");
      setWhatsapp(aluno.whatsapp || "");
      setEmail(aluno.email || "");
      setContatoEmergenciaNome(aluno.contato_emergencia_nome || "");
      setContatoEmergenciaTelefone(aluno.contato_emergencia_telefone || "");
      setTipoSanguineo(aluno.tipo_sanguineo || "");
      setFaixa(aluno.faixa || "Branca");
      setGraus(aluno.graus || 0);
      setTipoInscricao(aluno.tipo || "visitante");
      setSelectedMemberId(aluno.member_id || null);
    } else {
      resetForm();
    }
  }, [aluno, open]);

  const resetForm = () => {
    setNome(""); setCpf(""); setDataNascimento(""); setEndereco("");
    setTelefone(""); setWhatsapp(""); setEmail("");
    setContatoEmergenciaNome(""); setContatoEmergenciaTelefone("");
    setTipoSanguineo(""); setFaixa("Branca"); setGraus(0);
    setSelectedMemberId(null); setMembroBusca(""); setTipoInscricao("visitante");
  };

  const handleSelectMembro = (member: any) => {
    setSelectedMemberId(member.id);
    setNome(member.full_name);
    setWhatsapp(member.whatsapp || "");
    setDataNascimento(member.data_nascimento || "");
    setMembroBusca(member.full_name);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    const payload: any = {
      nome: nome.trim(),
      cpf, data_nascimento: dataNascimento, endereco,
      telefone, whatsapp, email,
      contato_emergencia_nome: contatoEmergenciaNome,
      contato_emergencia_telefone: contatoEmergenciaTelefone,
      tipo_sanguineo: tipoSanguineo, faixa, graus,
      tipo: tipoInscricao,
      member_id: selectedMemberId,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("jiujitsu_alunos").update(payload).eq("id", aluno.id));
    } else {
      ({ error } = await supabase.from("jiujitsu_alunos").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar aluno", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEditing ? "Aluno atualizado!" : "Aluno cadastrado!" });
      queryClient.invalidateQueries({ queryKey: ["jiujitsu_alunos"] });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
        </DialogHeader>

        {!isEditing && (
          <Tabs value={tipoInscricao} onValueChange={(v) => { setTipoInscricao(v); resetForm(); setTipoInscricao(v); }}>
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
                    onChange={(e) => setMembroBusca(e.target.value)}
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
        )}

        <div className="space-y-3 mt-2">
          {(tipoInscricao === "visitante" || isEditing) && (
            <>
              <div>
                <Label>Nome Completo *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Telefone</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contato Emergência</Label>
                  <Input value={contatoEmergenciaNome} onChange={(e) => setContatoEmergenciaNome(e.target.value)} placeholder="Nome" />
                </div>
                <div>
                  <Label>Tel. Emergência</Label>
                  <Input value={contatoEmergenciaTelefone} onChange={(e) => setContatoEmergenciaTelefone(e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo Sanguíneo</Label>
              <Select value={tipoSanguineo} onValueChange={setTipoSanguineo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_SANGUINEOS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Faixa</Label>
              <Select value={faixa} onValueChange={setFaixa}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAIXAS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Graus</Label>
              <Input type="number" min={0} max={4} value={graus} onChange={(e) => setGraus(Number(e.target.value))} />
            </div>
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
