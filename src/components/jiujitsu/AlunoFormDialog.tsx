import { useEffect, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsStrictAdmin } from "@/hooks/useIsStrictAdmin";
import { maskCPF } from "@/lib/masks";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { differenceInYears, parse } from "date-fns";

const FAIXAS = ["Branca", "Azul", "Roxa", "Marrom", "Preta"];
const TIPOS_SANGUINEOS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENEROS = ["Masculino", "Feminino"];

interface AlunoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno?: any;
}

export function AlunoFormDialog({ open, onOpenChange, aluno }: AlunoFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!aluno;
  const isStrictAdmin = useIsStrictAdmin();

  const [tipoInscricao, setTipoInscricao] = useState<string>("visitante");
  const [membroBusca, setMembroBusca] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [responsavelTipo, setResponsavelTipo] = useState<string>("externo");
  const [responsavelBusca, setResponsavelBusca] = useState("");
  const [responsavelMemberId, setResponsavelMemberId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [contatoEmergenciaNome, setContatoEmergenciaNome] = useState("");
  const [contatoEmergenciaTelefone, setContatoEmergenciaTelefone] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelTelefone, setResponsavelTelefone] = useState("");
  const [tipoSanguineo, setTipoSanguineo] = useState("");
  const [planoSaude, setPlanoSaude] = useState(false);
  const [alergias, setAlergias] = useState("");
  const [medicamentoContinuo, setMedicamentoContinuo] = useState("");
  const [restricaoFisica, setRestricaoFisica] = useState("");
  const [faixa, setFaixa] = useState("Branca");
  const [graus, setGraus] = useState(0);
  const [termoEmergencia, setTermoEmergencia] = useState(false);
  const [termoImagem, setTermoImagem] = useState(false);

  const isMenor = dataNascimento
    ? differenceInYears(new Date(), new Date(dataNascimento)) < 18
    : false;

  const { data: members = [] } = useQuery({
    queryKey: ["members_busca_jiujitsu", membroBusca],
    enabled: tipoInscricao === "membro" && membroBusca.length >= 3,
    queryFn: async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, full_name, photo_url, whatsapp, birth_date")
        .ilike("full_name", `%${membroBusca}%`)
        .limit(10);
      return (data || []) as any[];
    },
  });

  const { data: responsavelMembers = [] } = useQuery({
    queryKey: ["members_busca_responsavel_jj", responsavelBusca],
    enabled: responsavelTipo === "membro" && responsavelBusca.length >= 3 && isMenor,
    queryFn: async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, full_name, whatsapp")
        .ilike("full_name", `%${responsavelBusca}%`)
        .limit(10);
      return (data || []) as any[];
    },
  });

  useEffect(() => {
    if (aluno) {
      setNome(aluno.nome || "");
      setCpf(isStrictAdmin ? (aluno.cpf || "") : maskCPF(aluno.cpf));
      setDataNascimento(aluno.data_nascimento || "");
      setGenero(aluno.genero || "");
      setEndereco(aluno.endereco || "");
      setTelefone(aluno.telefone || aluno.whatsapp || "");
      setWhatsapp(aluno.whatsapp || "");
      setEmail(aluno.email || "");
      setContatoEmergenciaNome(aluno.contato_emergencia_nome || "");
      setContatoEmergenciaTelefone(aluno.contato_emergencia_telefone || "");
      setResponsavelNome(aluno.responsavel_nome || "");
      setResponsavelTelefone(aluno.responsavel_telefone || "");
      setTipoSanguineo(aluno.tipo_sanguineo || "");
      setPlanoSaude(aluno.plano_saude || false);
      setAlergias(aluno.alergias || "");
      setMedicamentoContinuo(aluno.medicamento_continuo || "");
      setRestricaoFisica(aluno.restricao_fisica || "");
      setFaixa(aluno.faixa || "Branca");
      setGraus(aluno.graus || 0);
      setTipoInscricao(aluno.tipo || "visitante");
      setSelectedMemberId(aluno.member_id || null);
      setTermoEmergencia(aluno.termo_emergencia_aceito || false);
      setTermoImagem(aluno.termo_imagem_aceito || false);

      // Se for membro vinculado, buscar dados faltantes do cadastro
      if (aluno.member_id) {
        supabase
          .from("members")
          .select("full_name, whatsapp, phone, email, address, neighborhood, city, state, zip_code, birth_date, gender, emergency_contact_name, emergency_contact_phone, blood_type")
          .eq("id", aluno.member_id)
          .maybeSingle()
          .then(({ data: member }) => {
            if (member) {
              if (!aluno.telefone && !aluno.whatsapp) setTelefone(member.whatsapp || member.phone || "");
              if (!aluno.whatsapp) setWhatsapp(member.whatsapp || "");
              if (!aluno.email) setEmail(member.email || "");
              if (!aluno.endereco) setEndereco(member.address || "");
              if (!aluno.data_nascimento) setDataNascimento(member.birth_date || "");
              if (!aluno.genero) setGenero(member.gender || "");
              if (!aluno.contato_emergencia_nome) setContatoEmergenciaNome(member.emergency_contact_name || "");
              if (!aluno.contato_emergencia_telefone) setContatoEmergenciaTelefone(member.emergency_contact_phone || "");
              if (!aluno.tipo_sanguineo) setTipoSanguineo(member.blood_type || "");
            }
          });
      }
    } else {
      resetForm();
    }
  }, [aluno, open]);

  const resetForm = () => {
    setNome(""); setCpf(""); setDataNascimento(""); setGenero(""); setEndereco("");
    setTelefone(""); setWhatsapp(""); setEmail("");
    setContatoEmergenciaNome(""); setContatoEmergenciaTelefone("");
    setResponsavelNome(""); setResponsavelTelefone("");
    setResponsavelTipo("externo"); setResponsavelBusca(""); setResponsavelMemberId(null);
    setTipoSanguineo(""); setPlanoSaude(false);
    setAlergias(""); setMedicamentoContinuo(""); setRestricaoFisica("");
    setFaixa("Branca"); setGraus(0);
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

    const payload: any = {
      nome: nome.trim(),
      ...(isStrictAdmin || !isEditing ? { cpf } : {}),
      data_nascimento: dataNascimento, genero, endereco,
      telefone, whatsapp, email,
      contato_emergencia_nome: contatoEmergenciaNome,
      contato_emergencia_telefone: contatoEmergenciaTelefone,
      responsavel_nome: responsavelNome,
      responsavel_telefone: responsavelTelefone,
      tipo_sanguineo: tipoSanguineo,
      plano_saude: planoSaude,
      alergias: alergias || null,
      medicamento_continuo: medicamentoContinuo || null,
      restricao_fisica: restricaoFisica || null,
      faixa, graus,
      tipo: tipoInscricao,
      member_id: selectedMemberId,
      termo_emergencia_aceito: termoEmergencia,
      termo_imagem_aceito: termoImagem,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
        </DialogHeader>

        {!isEditing && (
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
        )}

        <div className="space-y-4 mt-2">
          {/* Dados Pessoais */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>
          {(tipoInscricao === "visitante" || isEditing) && (
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
              <Label>CPF {!isStrictAdmin && isEditing && "(restrito)"}</Label>
              <Input 
                value={cpf} 
                onChange={(e) => { if (isStrictAdmin || !isEditing) setCpf(e.target.value); }}
                readOnly={!isStrictAdmin && isEditing}
                disabled={!isStrictAdmin && isEditing}
                className={!isStrictAdmin && isEditing ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          </div>

          {(tipoInscricao === "visitante" || isEditing) && (
            <>
              <div>
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
              </div>
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
            </>
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
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Responsável (Menor de Idade) *</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">O responsável é membro da igreja?</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={responsavelTipo === "membro" ? "default" : "outline"} onClick={() => { setResponsavelTipo("membro"); setResponsavelNome(""); setResponsavelTelefone(""); setResponsavelMemberId(null); setResponsavelBusca(""); }}>
                      Sim, é membro
                    </Button>
                    <Button type="button" size="sm" variant={responsavelTipo === "externo" ? "default" : "outline"} onClick={() => { setResponsavelTipo("externo"); setResponsavelNome(""); setResponsavelTelefone(""); setResponsavelMemberId(null); setResponsavelBusca(""); }}>
                      Não
                    </Button>
                  </div>
                </div>

                {responsavelTipo === "membro" && (
                  <div>
                    <Label>Buscar Membro Responsável</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Digite o nome do responsável..."
                        value={responsavelBusca}
                        onChange={(e) => { setResponsavelBusca(e.target.value); setResponsavelMemberId(null); }}
                        className="pl-9"
                      />
                    </div>
                    {responsavelMembers.length > 0 && responsavelBusca.length >= 3 && !responsavelMemberId && (
                      <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                        {responsavelMembers.map((m: any) => (
                          <button
                            key={m.id}
                            className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            onClick={() => {
                              setResponsavelMemberId(m.id);
                              setResponsavelNome(m.full_name);
                              setResponsavelTelefone(m.whatsapp || "");
                              setResponsavelBusca(m.full_name);
                            }}
                          >
                            <span>{m.full_name}</span>
                            {m.whatsapp && <span className="text-xs text-muted-foreground ml-2">({m.whatsapp})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {responsavelMemberId && (
                      <p className="text-sm text-green-600 mt-1">✓ {responsavelNome} {responsavelTelefone && `- ${responsavelTelefone}`}</p>
                    )}
                  </div>
                )}

                {responsavelTipo === "externo" && (
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
                )}
              </div>
            </>
          )}

          {/* Saúde */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Informações de Saúde</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo Sanguíneo</Label>
              <Select value={tipoSanguineo} onValueChange={setTipoSanguineo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_SANGUINEOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox id="planoSaude" checked={planoSaude} onCheckedChange={(v) => setPlanoSaude(!!v)} />
              <Label htmlFor="planoSaude" className="cursor-pointer">Possui plano de saúde</Label>
            </div>
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
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Graduação</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faixa</Label>
              <Select value={faixa} onValueChange={setFaixa}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FAIXAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Graus</Label>
              <Input type="number" min={0} max={4} value={graus} onChange={(e) => setGraus(Number(e.target.value))} />
            </div>
          </div>

          {/* Termos */}
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide pt-2">Declarações e Termos</h3>
          <div className="space-y-3 rounded-md border p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <Checkbox id="termoEmergencia" checked={termoEmergencia} onCheckedChange={(v) => setTermoEmergencia(!!v)} className="mt-0.5" />
              <Label htmlFor="termoEmergencia" className="text-sm leading-relaxed cursor-pointer">
                Declaro que, em caso de emergência, autorizo a Igreja Gileade a encaminhar o(a) aluno(a) ao posto de atendimento médico mais próximo, 
                isentando a igreja e seus representantes de qualquer responsabilidade. 
                {isMenor && " Comprometo-me, como responsável, a acompanhar o(a) menor durante as aulas e auxiliar sempre que necessário."}
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="termoImagem" checked={termoImagem} onCheckedChange={(v) => setTermoImagem(!!v)} className="mt-0.5" />
              <Label htmlFor="termoImagem" className="text-sm leading-relaxed cursor-pointer">
                Autorizo o uso da minha imagem (ou do menor sob minha responsabilidade) em fotos e vídeos para divulgação 
                institucional da igreja e do ministério de Jiu-Jitsu, em mídias sociais e materiais de comunicação.
              </Label>
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
