import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CheckCircle2, Loader2 } from "lucide-react";
import { differenceInYears } from "date-fns";
import logoGileade from "@/assets/logo-gileade.jpeg";

const GENEROS = ["Masculino", "Feminino"];

export default function InscricaoJiuJitsu() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tipoInscricao, setTipoInscricao] = useState<string>("visitante");
  const [membroBusca, setMembroBusca] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
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
    queryKey: ["members_busca_jiujitsu_pub", membroBusca],
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

  const handleSelectMembro = (member: any) => {
    setSelectedMemberId(member.id);
    setNome(member.full_name);
    setTelefone(member.whatsapp || "");
    setDataNascimento(member.birth_date || "");
    setMembroBusca(member.full_name);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!dataNascimento) {
      toast({ title: "Data de nascimento é obrigatória", variant: "destructive" });
      return;
    }
    if (!contatoEmergenciaNome.trim() || !contatoEmergenciaTelefone.trim()) {
      toast({ title: "Contato de emergência é obrigatório", variant: "destructive" });
      return;
    }
    if (isMenor && (!responsavelNome.trim() || !responsavelTelefone.trim())) {
      toast({ title: "Dados do responsável são obrigatórios para menores", variant: "destructive" });
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



    // Check duplicate
    const normalizedName = nome.trim().toLowerCase();
    const { data: existing } = await supabase
      .from("jiujitsu_inscricoes")
      .select("id")
      .ilike("nome", normalizedName)
      .not("status", "in", '("rejeitado","rejeitada")')
      .limit(1);

    if (existing && existing.length > 0) {
      toast({ title: "INSCRIÇÃO JÁ ENVIADA", description: "Já existe uma inscrição com este nome.", variant: "destructive" });
      setSaving(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("jiujitsu_inscricoes").insert({
      nome: nome.trim(),
      data_nascimento: dataNascimento || null,
      genero: genero || null,
      telefone: telefone || null,
      whatsapp: telefone || null,
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

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao enviar inscrição", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Inscrição Enviada!</h2>
            <p className="text-muted-foreground">
              Sua inscrição no ministério de Jiu-Jitsu foi recebida com sucesso. 
              Entraremos em contato em breve.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Nova Inscrição
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoGileade} alt="Igreja Gileade" className="h-20 w-20 rounded-full mx-auto mb-4 object-cover" />
          <h1 className="text-2xl font-bold text-foreground">🥋 Inscrição Jiu-Jitsu</h1>
          <p className="text-muted-foreground mt-1">Ministério de Jiu-Jitsu - Igreja Gileade</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ficha de Inscrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tipo */}
            <div>
              <Label className="text-sm font-medium">Você é membro da Igreja Gileade?</Label>
              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant={tipoInscricao === "membro" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoInscricao("membro")}
                >
                  Sim, sou membro
                </Button>
                <Button
                  type="button"
                  variant={tipoInscricao === "visitante" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoInscricao("visitante")}
                >
                  Não
                </Button>
              </div>
            </div>

            {tipoInscricao === "membro" && (
              <div>
                <Label>Buscar seu nome</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite seu nome..."
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
                  <p className="text-sm text-green-600 mt-1">✓ {nome}</p>
                )}
              </div>
            )}

            {/* Dados Pessoais */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>
              {(tipoInscricao === "visitante" || !selectedMemberId) && (
                <div>
                  <Label>Nome Completo *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Data de Nascimento *</Label>
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
                <div>
                  <Label>Telefone / WhatsApp *</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            {/* Contato de Emergência */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contato de Emergência *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={contatoEmergenciaNome} onChange={(e) => setContatoEmergenciaNome(e.target.value)} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={contatoEmergenciaTelefone} onChange={(e) => setContatoEmergenciaTelefone(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Responsável (menor) */}
            {isMenor && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Responsável (Menor de Idade) *</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome do Responsável</Label>
                    <Input value={responsavelNome} onChange={(e) => setResponsavelNome(e.target.value)} />
                  </div>
                  <div>
                    <Label>Telefone do Responsável</Label>
                    <Input value={responsavelTelefone} onChange={(e) => setResponsavelTelefone(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Saúde */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações de Saúde</h3>
              <div className="flex items-center gap-2">
                <Checkbox id="planoSaudePub" checked={planoSaude} onCheckedChange={(v) => setPlanoSaude(!!v)} />
                <Label htmlFor="planoSaudePub" className="cursor-pointer">Possui plano de saúde</Label>
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
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Declarações e Termos</h3>
              <div className="space-y-3 rounded-md border p-4 bg-muted/30">
                <div className="flex items-start gap-3">
                  <Checkbox id="termoEmergenciaPub" checked={termoEmergencia} onCheckedChange={(v) => setTermoEmergencia(!!v)} className="mt-0.5" />
                  <Label htmlFor="termoEmergenciaPub" className="text-sm leading-relaxed cursor-pointer">
                    Declaro que, em caso de emergência, autorizo a Igreja Gileade a encaminhar o(a) aluno(a) ao posto de atendimento médico mais próximo, 
                    isentando a igreja e seus representantes de qualquer responsabilidade.
                    {isMenor && " Comprometo-me, como responsável, a acompanhar o(a) menor durante as aulas e auxiliar sempre que necessário."}
                  </Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="termoImagemPub" checked={termoImagem} onCheckedChange={(v) => setTermoImagem(!!v)} className="mt-0.5" />
                  <Label htmlFor="termoImagemPub" className="text-sm leading-relaxed cursor-pointer">
                    Autorizo o uso da minha imagem (ou do menor sob minha responsabilidade) em fotos e vídeos para divulgação 
                    institucional da igreja e do ministério de Jiu-Jitsu, em mídias sociais e materiais de comunicação.
                  </Label>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</> : "Enviar Inscrição"}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Igreja Gileade © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
