import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MaskedInput } from "@/components/ui/masked-input";
import { DateInput } from "@/components/ui/date-input";
import { MemberSelect } from "@/components/ui/member-select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCepLookup } from "@/hooks/useCepLookup";
import { formatNameField } from "@/lib/text-utils";
import { Loader2, HeartHandshake, CheckCircle2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { dispararMensagemInscricaoRecebida } from "@/lib/whatsapp-notifications";

export default function InscricaoCasais() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Member search state
  const [membroMasculinoId, setMembroMasculinoId] = useState<string | null>(null);
  const [membroFemininoId, setMembroFemininoId] = useState<string | null>(null);

  // Form state
  const [nomeMasculino, setNomeMasculino] = useState("");
  const [nomeFeminino, setNomeFeminino] = useState("");
  const [whatsappMasculino, setWhatsappMasculino] = useState("");
  const [whatsappFeminino, setWhatsappFeminino] = useState("");
  const [emailMasculino, setEmailMasculino] = useState("");
  const [emailFeminino, setEmailFeminino] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("casado");
  const [modalidadeCasamento, setModalidadeCasamento] = useState("");
  const [dataModalidade, setDataModalidade] = useState("");
  const [jaFoiCasado, setJaFoiCasado] = useState("nao");
  const [quantasVezesCasado, setQuantasVezesCasado] = useState("");
  const [qtdMeninos, setQtdMeninos] = useState("");
  const [qtdMeninas, setQtdMeninas] = useState("");
  const [filhos, setFilhos] = useState<{ nome: string; idade: string; genero: string }[]>([]);
  const [congregaGileade, setCongregaGileade] = useState("sim");
  const [ondeCongrega, setOndeCongrega] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [casaRefugioId, setCasaRefugioId] = useState<string | null>(null);
  const [frequentaCR, setFrequentaCR] = useState("nao");
  const [observacoes, setObservacoes] = useState("");
  const [aceiteImagem, setAceiteImagem] = useState(false);
  const [aceiteConfidencialidade, setAceiteConfidencialidade] = useState(false);

  const handleCepResolved = useCallback((data: { address: string; neighborhood: string; city: string; state: string }) => {
    setEndereco(data.address);
    setBairro(data.neighborhood);
    setCidade(data.city);
    setEstado(data.state);
  }, []);

  const { isLoading: cepLoading } = useCepLookup(cep, handleCepResolved);

  const { data: casasRefugio } = useQuery({
    queryKey: ["casas_refugio_list_public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("casas_refugio").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch members for auto-fill (using public-safe view to bypass RLS for unauthenticated users)
  const { data: allMembers } = useQuery({
    queryKey: ["members_for_inscricao_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members_safe" as any)
        .select("id, full_name, whatsapp, email, cep, address, number, complement, neighborhood, city, state, casa_refugio_id")
        .order("full_name");
      if (error) throw error;
      return data as any[];
    },
  });

  // Auto-fill esposo data
  useEffect(() => {
    if (!membroMasculinoId || !allMembers) return;
    const m = allMembers.find((x) => x.id === membroMasculinoId);
    if (!m) return;
    setNomeMasculino(m.full_name || "");
    setWhatsappMasculino(m.whatsapp || "");
    setEmailMasculino(m.email || "");
    if (!endereco && m.address) {
      setEndereco(m.address);
      setNumero(m.number || "");
      setComplemento(m.complement || "");
      setBairro(m.neighborhood || "");
      setCidade(m.city || "");
      setEstado(m.state || "");
      setCep(m.cep || "");
    }
    if (m.casa_refugio_id) {
      setFrequentaCR("sim");
      setCasaRefugioId(m.casa_refugio_id);
    }
  }, [membroMasculinoId, allMembers]);

  // Auto-fill esposa data
  useEffect(() => {
    if (!membroFemininoId || !allMembers) return;
    const m = allMembers.find((x) => x.id === membroFemininoId);
    if (!m) return;
    setNomeFeminino(m.full_name || "");
    setWhatsappFeminino(m.whatsapp || "");
    setEmailFeminino(m.email || "");
    if (!endereco && m.address) {
      setEndereco(m.address);
      setNumero(m.number || "");
      setComplemento(m.complement || "");
      setBairro(m.neighborhood || "");
      setCidade(m.city || "");
      setEstado(m.state || "");
      setCep(m.cep || "");
    }
    if (!casaRefugioId && m.casa_refugio_id) {
      setFrequentaCR("sim");
      setCasaRefugioId(m.casa_refugio_id);
    }
  }, [membroFemininoId, allMembers]);

  // Update filhos count
  useEffect(() => {
    const totalMeninos = parseInt(qtdMeninos) || 0;
    const totalMeninas = parseInt(qtdMeninas) || 0;
    const total = totalMeninos + totalMeninas;

    setFilhos((prev) => {
      if (total === 0) return [];
      if (total > prev.length) {
        const newOnes = [];
        for (let i = prev.length; i < total; i++) {
          const isMenino = i < totalMeninos;
          newOnes.push({ nome: "", idade: "", genero: isMenino ? "masculino" : "feminino" });
        }
        return [...prev, ...newOnes];
      }
      return prev.slice(0, total);
    });
  }, [qtdMeninos, qtdMeninas]);

  const updateFilho = (index: number, field: string, value: string) => {
    setFilhos((prev) => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeMasculino.trim() || !nomeFeminino.trim()) {
      toast({ title: "Preencha os nomes do esposo e esposa", variant: "destructive" });
      return;
    }
    if (!aceiteImagem || !aceiteConfidencialidade) {
      toast({ title: "É necessário aceitar os termos para prosseguir", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        status: "pendente",
        membro_masculino_id: membroMasculinoId || null,
        membro_feminino_id: membroFemininoId || null,
        nome_masculino: formatNameField(nomeMasculino),
        nome_feminino: formatNameField(nomeFeminino),
        whatsapp_masculino: whatsappMasculino || null,
        whatsapp_feminino: whatsappFeminino || null,
        email_masculino: emailMasculino || null,
        email_feminino: emailFeminino || null,
        estado_civil: estadoCivil || null,
        modalidade_casamento: modalidadeCasamento || null,
        data_modalidade: dataModalidade || null,
        ja_foi_casado: jaFoiCasado === "sim",
        quantas_vezes_casado: jaFoiCasado === "sim" ? (parseInt(quantasVezesCasado) || 0) : 0,
        qtd_filhos_meninos: parseInt(qtdMeninos) || 0,
        qtd_filhos_meninas: parseInt(qtdMeninas) || 0,
        congrega_gileade: congregaGileade === "sim",
        onde_congrega: congregaGileade === "nao" ? (ondeCongrega || null) : null,
        cep: cep || null,
        endereco: endereco || null,
        numero_endereco: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        casa_refugio_id: frequentaCR === "sim" ? casaRefugioId : null,
        observacoes: observacoes || null,
        aceite_imagem: aceiteImagem,
        aceite_confidencialidade: aceiteConfidencialidade,
      };

      const { data, error } = await supabase.from("casais_inscritos").insert(payload).select("id").single();
      if (error) throw error;

      // Insert filhos
      if (filhos.length > 0) {
        const filhosPayload = filhos
          .filter((f) => f.nome.trim())
          .map((f) => ({
            inscricao_id: data.id,
            nome: formatNameField(f.nome),
            idade: parseInt(f.idade) || null,
            genero: f.genero || null,
          }));
        if (filhosPayload.length > 0) {
          await supabase.from("casais_inscritos_filhos").insert(filhosPayload);
        }
      }

      // Disparo (best-effort) das mensagens de inscrição recebida
      try {
        if (whatsappMasculino) {
          await dispararMensagemInscricaoRecebida({
            telefone: whatsappMasculino,
            nome: nomeMasculino,
            tituloEvento: "Curso de Casais",
          });
        }
        if (whatsappFeminino) {
          await dispararMensagemInscricaoRecebida({
            telefone: whatsappFeminino,
            nome: nomeFeminino,
            tituloEvento: "Curso de Casais",
          });
        }
      } catch (waErr) {
        console.warn("[casais] falha disparo whatsapp:", waErr);
      }

      setSubmitted(true);
    } catch (err) {
      toast({ title: "Erro ao enviar inscrição", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-heading font-bold">Inscrição Enviada!</h2>
            <p className="text-muted-foreground">
              Sua ficha de inscrição foi recebida com sucesso. A equipe de liderança irá analisar e entrar em contato.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Fazer Nova Inscrição
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoGileade} alt="Logo" className="w-16 h-16 mx-auto rounded-full mb-4 object-cover" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <HeartHandshake className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold">Inscrição - Ministério de Casais</h1>
          </div>
          <p className="text-muted-foreground">Preencha os dados abaixo para se inscrever no Ministério de Casais.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Esposo */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Dados do Esposo</h3>
                <div className="space-y-2">
                  <Label>Buscar membro cadastrado</Label>
                  <MemberSelect value={membroMasculinoId} onChange={setMembroMasculinoId} placeholder="Buscar esposo..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input value={nomeMasculino} onChange={(e) => setNomeMasculino(e.target.value)} required placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <MaskedInput mask="phone" value={whatsappMasculino} onChange={setWhatsappMasculino} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={emailMasculino} onChange={(e) => setEmailMasculino(e.target.value)} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Esposa */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Dados da Esposa</h3>
                <div className="space-y-2">
                  <Label>Buscar membro cadastrado</Label>
                  <MemberSelect value={membroFemininoId} onChange={setMembroFemininoId} placeholder="Buscar esposa..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input value={nomeFeminino} onChange={(e) => setNomeFeminino(e.target.value)} required placeholder="Nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <MaskedInput mask="phone" value={whatsappFeminino} onChange={setWhatsappFeminino} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={emailFeminino} onChange={(e) => setEmailFeminino(e.target.value)} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Estado Civil */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Situação Conjugal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado Civil</Label>
                    <Select value={estadoCivil} onValueChange={setEstadoCivil}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casado">Casado</SelectItem>
                        <SelectItem value="uniao_estavel">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select value={modalidadeCasamento} onValueChange={setModalidadeCasamento}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uniao_estavel">União estável documentada</SelectItem>
                        <SelectItem value="morando_juntos">Morando juntos</SelectItem>
                        <SelectItem value="civil_religioso">Casados Civil e Religioso</SelectItem>
                        <SelectItem value="so_civil">Casados só civil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {modalidadeCasamento && (
                  <div className="space-y-2 max-w-xs">
                    <Label>Desde quando? (Pode ser aproximado)</Label>
                    <DateInput value={dataModalidade} onChange={setDataModalidade} maxDate={undefined} />
                  </div>
                )}
              </div>

              <Separator />

              {/* Já foi casado */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Já foi casado antes?</h3>
                <RadioGroup value={jaFoiCasado} onValueChange={setJaFoiCasado} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="jfc-nao" />
                    <Label htmlFor="jfc-nao">Não</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="jfc-sim" />
                    <Label htmlFor="jfc-sim">Sim</Label>
                  </div>
                </RadioGroup>
                {jaFoiCasado === "sim" && (
                  <div className="space-y-2 max-w-xs">
                    <Label>Quantas vezes?</Label>
                    <Input type="number" min="1" value={quantasVezesCasado} onChange={(e) => setQuantasVezesCasado(e.target.value)} />
                  </div>
                )}
              </div>

              <Separator />

              {/* Filhos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Filhos</h3>
                <div className="grid grid-cols-2 gap-4 max-w-xs">
                  <div className="space-y-2">
                    <Label>Meninos</Label>
                    <Input type="number" min="0" value={qtdMeninos} onChange={(e) => setQtdMeninos(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Meninas</Label>
                    <Input type="number" min="0" value={qtdMeninas} onChange={(e) => setQtdMeninas(e.target.value)} placeholder="0" />
                  </div>
                </div>
                {filhos.length > 0 && (
                  <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                    {filhos.map((filho, index) => (
                      <div key={index} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">
                          {filho.genero === "masculino" ? `Filho ${index + 1}` : `Filha ${index + 1 - (parseInt(qtdMeninos) || 0)}`}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nome</Label>
                            <Input value={filho.nome} onChange={(e) => updateFilho(index, "nome", e.target.value)} placeholder="Nome do(a) filho(a)" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Idade</Label>
                            <Input type="number" min="0" value={filho.idade} onChange={(e) => updateFilho(index, "idade", e.target.value)} placeholder="Idade" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Congrega */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Congrega em Gileade?</h3>
                <RadioGroup value={congregaGileade} onValueChange={(v) => { setCongregaGileade(v); if (v === "sim") setOndeCongrega(""); }} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="cg-sim" />
                    <Label htmlFor="cg-sim">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="cg-nao" />
                    <Label htmlFor="cg-nao">Não</Label>
                  </div>
                </RadioGroup>
                {congregaGileade === "nao" && (
                  <div className="max-w-md space-y-2">
                    <Label>Onde congrega?</Label>
                    <Input value={ondeCongrega} onChange={(e) => setOndeCongrega(e.target.value)} placeholder="Informe a igreja..." />
                  </div>
                )}
              </div>

              <Separator />

              {/* Endereço */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <MaskedInput mask="cep" value={cep} onChange={setCep} />
                      {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço</Label>
                    <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
                  </div>
                </div>
                <div className="max-w-xs space-y-2">
                  <Label>Estado</Label>
                  <Input value={estado} onChange={(e) => setEstado(e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Casa Refúgio */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">Frequenta alguma Casa de Refúgio?</h3>
                <RadioGroup value={frequentaCR} onValueChange={(v) => { setFrequentaCR(v); if (v === "nao") setCasaRefugioId(null); }} className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="cr-nao" />
                    <Label htmlFor="cr-nao">Não</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="cr-sim" />
                    <Label htmlFor="cr-sim">Sim</Label>
                  </div>
                </RadioGroup>
                {frequentaCR === "sim" && (
                  <div className="max-w-md space-y-2">
                    <Label>Casa de Refúgio</Label>
                    <Select value={casaRefugioId || ""} onValueChange={setCasaRefugioId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {casasRefugio?.map((cr) => (
                          <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </div>

              <Separator />

              {/* Valor do Curso */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  💰 Investimento
                </h3>
                <p className="text-sm text-muted-foreground">
                  O valor do curso é de <span className="font-bold text-foreground">R$ 100,00</span> por casal, 
                  a ser pago no ato da matrícula ou conforme orientação da coordenação.
                </p>
              </div>

              <Separator />

              {/* Termos */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base">Termos e Autorizações</h3>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30">
                  <Checkbox
                    id="aceite-imagem"
                    checked={aceiteImagem}
                    onCheckedChange={(checked) => setAceiteImagem(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="aceite-imagem" className="text-sm leading-relaxed cursor-pointer">
                    <span className="font-medium">Termo de Direito de Imagem:</span> Autorizo o uso da minha imagem e do meu cônjuge, 
                    captada durante as atividades do Ministério de Casais (fotos e vídeos), para fins de divulgação 
                    institucional em redes sociais, site e materiais da igreja, sem qualquer ônus.
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30">
                  <Checkbox
                    id="aceite-confidencialidade"
                    checked={aceiteConfidencialidade}
                    onCheckedChange={(checked) => setAceiteConfidencialidade(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="aceite-confidencialidade" className="text-sm leading-relaxed cursor-pointer">
                    <span className="font-medium">Termo de Confidencialidade:</span> Comprometo-me a manter sigilo sobre todos os 
                    assuntos pessoais e familiares compartilhados durante os encontros do Ministério de Casais, 
                    respeitando a privacidade de todos os participantes. Declaro estar ciente de que o conteúdo 
                    das sessões é confidencial e não deverá ser reproduzido ou divulgado fora do ambiente do curso.
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving || !aceiteImagem || !aceiteConfidencialidade} size="lg">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar Inscrição
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
