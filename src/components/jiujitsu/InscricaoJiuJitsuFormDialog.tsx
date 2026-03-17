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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { differenceInYears } from "date-fns";

const GENEROS = ["Masculino", "Feminino"];

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
  const [genero, setGenero] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [contatoEmergenciaNome, setContatoEmergenciaNome] = useState("");
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelTelefone, setResponsavelTelefone] = useState("");
  const [planoSaude, setPlanoSaude] = useState(false);
  const [alergias, setAlergias] = useState("");
  const [medicamentoContinuo, setMedicamentoContinuo] = useState("");
  const [restricaoFisica, setRestricaoFisica] = useState("");
  const [possuiGraduacao, setPossuiGraduacao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [termoEmergencia, setTermoEmergencia] = useState(false);
  const [termoImagem, setTermoImagem] = useState(false);

  const isMenor = dataNascimento
    ? differenceInYears(new Date(), new Date(dataNascimento)) < 18
    : false;

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
    setNome(""); setDataNascimento(""); setGenero(""); setTelefone("");
    setWhatsapp(""); setEmail(""); setCpf(""); setObservacoes("");
    setContatoEmergenciaNome(""); setContatoEmergenciaTelefone("");
    setResponsavelNome(""); setResponsavelTelefone("");
    setPlanoSaude(false); setAlergias(""); setMedicamentoContinuo("");
    setRestricaoFisica(""); setPossuiGraduacao("");
    setSelectedMemberId(null); setMembroBusca(""); setTipoInscricao("visitante");
    setTermoEmergencia(false); setTermoImagem(false);
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
    if (!termoEmergencia) {
      toast({ title: "É necessário aceitar a declaração de emergência", variant: "destructive" });
      return;
    }
    if (!termoImagem) {
      toast({ title: "É necessário aceitar o termo de direito de imagem", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("jiujitsu_inscricoes").insert({
      nome: nome.trim(),
      data_nascimento: dataNascimento || null,
      genero: genero || null,
      telefone: telefone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      cpf: cpf || null,
      tipo: tipoInscricao,
      member_id: selectedMemberId,
      contato_emergencia_nome: contatoEmergenciaNome || null,
      contato_emergencia_telefone: contatoEmergenciaTelefone || null,
      responsavel_nome: responsavelNome || null,
      responsavel_telefone: responsavelTelefone || null,
      plano_saude: planoSaude,
      alergias: alergias || null,
      medicamento_continuo: medicamentoContinuo || null,
      restricao_fisica: restricaoFisica || null,
      possui_graduacao: possuiGraduacao || null,
      observacoes: observacoes || null,
      termo_emergencia_aceito: termoEmergencia,
      termo_imagem_aceito: termoImagem,
      status: "pendente",
    } as any);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Inscrição - Jiu-Jitsu</DialogTitle>
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

        <div className="space-y-4 mt-2">
          {/* Dados Pessoais */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>
          {tipoInscricao === "visitante" && (
            <div>
              <Label>Nome Completo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data de Nascimento</Label>
              <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
            </div>
            <div>
              <Label>Gênero</Label>
              <Select value={genero} onValueChange={setGenero}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {GENEROS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </div>
          </div>
          {tipoInscricao === "visitante" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone / WhatsApp</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          )}

          {/* Contato Emergência */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Contato de Emergência</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={contatoEmergenciaNome} onChange={(e) => setContatoEmergenciaNome(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={contatoEmergenciaTelefone} onChange={(e) => setContatoEmergenciaTelefone(e.target.value)} />
            </div>
          </div>

          {/* Responsável (menor) */}
          {isMenor && (
            <>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Responsável (Menor de Idade)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome do Responsável *</Label>
                  <Input value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
                </div>
                <div>
                  <Label>Telefone do Responsável *</Label>
                  <Input value={responsavelTelefone} onChange={(e) => setResponsavelTelefone(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Saúde */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Informações de Saúde</h3>
          <div className="flex items-center gap-2">
            <Checkbox id="planoSaudeInsc" checked={planoSaude} onCheckedChange={(v) => setPlanoSaude(!!v)} />
            <Label htmlFor="planoSaudeInsc" className="cursor-pointer">Possui plano de saúde</Label>
          </div>
          <div>
            <Label>Possui alguma alergia?</Label>
            <Input value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder="Descreva aqui..." />
          </div>
          <div>
            <Label>Toma algum medicamento contínuo?</Label>
            <Input value={medicamentoContinuo} onChange={(e) => setMedicamentoContinuo(e.target.value)} placeholder="Descreva aqui..." />
          </div>
          <div>
            <Label>Alguma restrição física?</Label>
            <Input value={restricaoFisica} onChange={(e) => setRestricaoFisica(e.target.value)} placeholder="Descreva aqui..." />
          </div>

          {/* Graduação */}
          <div>
            <Label>Possui alguma graduação em Jiu-Jitsu?</Label>
            <Input value={possuiGraduacao} onChange={(e) => setPossuiGraduacao(e.target.value)} placeholder="Ex: Faixa Azul 2 graus" />
          </div>

          <div>
            <Label>Observações</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Informações adicionais..." />
          </div>

          {/* Termos */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Declarações e Termos</h3>
          <div className="space-y-3 rounded-md border p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Checkbox id="termoEmergenciaInsc" checked={termoEmergencia} onCheckedChange={(v) => setTermoEmergencia(!!v)} className="mt-0.5" />
              <Label htmlFor="termoEmergenciaInsc" className="text-sm leading-relaxed cursor-pointer">
                Declaro que, em caso de emergência, autorizo a Igreja Gileade a encaminhar o(a) aluno(a) ao posto de atendimento médico mais próximo, 
                isentando a igreja e seus representantes de qualquer responsabilidade.
                {isMenor && " Comprometo-me, como responsável, a acompanhar o(a) menor durante as aulas e auxiliar sempre que necessário."}
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="termoImagemInsc" checked={termoImagem} onCheckedChange={(v) => setTermoImagem(!!v)} className="mt-0.5" />
              <Label htmlFor="termoImagemInsc" className="text-sm leading-relaxed cursor-pointer">
                Autorizo o uso da minha imagem (ou do menor sob minha responsabilidade) em fotos e vídeos para divulgação 
                institucional da igreja e do ministério de Jiu-Jitsu, em mídias sociais e materiais de comunicação.
              </Label>
            </div>
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
