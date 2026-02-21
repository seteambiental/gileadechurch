import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MaskedInput } from "@/components/ui/masked-input";
import { DateInput } from "@/components/ui/date-input";
import { MemberSelect } from "@/components/ui/member-select";
import { Separator } from "@/components/ui/separator";
import { useCepLookup } from "@/hooks/useCepLookup";
import { formatNameField } from "@/lib/text-utils";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Filho {
  id?: string;
  nome: string;
  idade: string;
  genero: string;
  member_id: string | null;
}

interface InscricaoCompletaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  turmas: { id: string; nome: string }[];
}

export function InscricaoCompletaFormDialog({
  open, onOpenChange, editingId, turmas,
}: InscricaoCompletaFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [turmaId, setTurmaId] = useState("");
  const [membroMasculinoId, setMembroMasculinoId] = useState<string | null>(null);
  const [membroFemininoId, setMembroFemininoId] = useState<string | null>(null);
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
  const [filhos, setFilhos] = useState<Filho[]>([]);
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
  const [saving, setSaving] = useState(false);

  const handleCepResolved = useCallback((data: { address: string; neighborhood: string; city: string; state: string }) => {
    setEndereco(data.address);
    setBairro(data.neighborhood);
    setCidade(data.city);
    setEstado(data.state);
  }, []);

  const { isLoading: cepLoading } = useCepLookup(cep, handleCepResolved);

  // Load casas de refugio
  const { data: casasRefugio } = useQuery({
    queryKey: ["casas_refugio_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("casas_refugio").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Auto-fill when member is selected
  const { data: allMembers } = useQuery({
    queryKey: ["members_for_inscricao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, whatsapp, email, cep, address, number, complement, neighborhood, city, state, casa_refugio_id")
        .order("full_name");
      if (error) throw error;
      return data;
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
    // Fill address if empty
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

  // Update filhos count based on qtd
  useEffect(() => {
    const totalMeninos = parseInt(qtdMeninos) || 0;
    const totalMeninas = parseInt(qtdMeninas) || 0;
    const total = totalMeninos + totalMeninas;
    
    setFilhos((prev) => {
      if (total === 0) return [];
      if (total > prev.length) {
        const newOnes: Filho[] = [];
        for (let i = prev.length; i < total; i++) {
          const isMenino = i < totalMeninos;
          newOnes.push({ nome: "", idade: "", genero: isMenino ? "masculino" : "feminino", member_id: null });
        }
        return [...prev, ...newOnes];
      }
      return prev.slice(0, total);
    });
  }, [qtdMeninos, qtdMeninas]);

  const updateFilho = (index: number, field: keyof Filho, value: string | null) => {
    setFilhos((prev) => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  // Auto-fill filho from member
  useEffect(() => {
    filhos.forEach((filho, index) => {
      if (filho.member_id && allMembers) {
        const m = allMembers.find((x) => x.id === filho.member_id);
        if (m && !filho.nome) {
          updateFilho(index, "nome", m.full_name);
        }
      }
    });
  }, [filhos.map(f => f.member_id).join(",")]);

  const resetForm = () => {
    setTurmaId("");
    setMembroMasculinoId(null);
    setMembroFemininoId(null);
    setNomeMasculino("");
    setNomeFeminino("");
    setWhatsappMasculino("");
    setWhatsappFeminino("");
    setEmailMasculino("");
    setEmailFeminino("");
    setEstadoCivil("casado");
    setModalidadeCasamento("");
    setDataModalidade("");
    setJaFoiCasado("nao");
    setQuantasVezesCasado("");
    setQtdMeninos("");
    setQtdMeninas("");
    setFilhos([]);
    setCongregaGileade("sim");
    setOndeCongrega("");
    setCep("");
    setEndereco("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setEstado("");
    setCasaRefugioId(null);
    setFrequentaCR("nao");
    setObservacoes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const payload: any = {
        turma_id: turmaId || null,
        status: editingId ? undefined : "pendente",
        membro_masculino_id: membroMasculinoId || null,
        membro_feminino_id: membroFemininoId || null,
        nome_masculino: nomeMasculino ? formatNameField(nomeMasculino) : null,
        nome_feminino: nomeFeminino ? formatNameField(nomeFeminino) : null,
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
      };

      let inscricaoId: string;

      if (editingId) {
        const { error } = await supabase.from("casais_inscritos").update(payload).eq("id", editingId);
        if (error) throw error;
        inscricaoId = editingId;
        // Delete existing filhos to re-insert
        await supabase.from("casais_inscritos_filhos").delete().eq("inscricao_id", editingId);
      } else {
        const { data, error } = await supabase.from("casais_inscritos").insert(payload).select("id").single();
        if (error) throw error;
        inscricaoId = data.id;
      }

      // Insert filhos
      if (filhos.length > 0) {
        const filhosPayload = filhos
          .filter((f) => f.nome.trim())
          .map((f) => ({
            inscricao_id: inscricaoId,
            nome: formatNameField(f.nome),
            idade: parseInt(f.idade) || null,
            genero: f.genero || null,
            member_id: f.member_id || null,
          }));
        if (filhosPayload.length > 0) {
          const { error } = await supabase.from("casais_inscritos_filhos").insert(filhosPayload);
          if (error) throw error;
        }
      }

      toast({ title: editingId ? "Inscrição atualizada" : "Inscrição realizada com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["casais_inscricoes_completas"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_all"] });
      queryClient.invalidateQueries({ queryKey: ["casais_inscritos_count"] });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Erro ao salvar inscrição", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Load editing data
  useEffect(() => {
    if (!editingId || !open) return;
    const loadData = async () => {
      const { data } = await supabase
        .from("casais_inscritos")
        .select("*")
        .eq("id", editingId)
        .single();
      if (!data) return;

      setTurmaId(data.turma_id);
      setMembroMasculinoId(data.membro_masculino_id);
      setMembroFemininoId(data.membro_feminino_id);
      setNomeMasculino(data.nome_masculino || "");
      setNomeFeminino(data.nome_feminino || "");
      setWhatsappMasculino(data.whatsapp_masculino || "");
      setWhatsappFeminino(data.whatsapp_feminino || "");
      setEmailMasculino((data as any).email_masculino || "");
      setEmailFeminino((data as any).email_feminino || "");
      setEstadoCivil((data as any).estado_civil || "casado");
      setModalidadeCasamento((data as any).modalidade_casamento || "");
      setDataModalidade((data as any).data_modalidade || "");
      setJaFoiCasado((data as any).ja_foi_casado ? "sim" : "nao");
      setQuantasVezesCasado(String((data as any).quantas_vezes_casado || ""));
      setQtdMeninos(String((data as any).qtd_filhos_meninos || ""));
      setQtdMeninas(String((data as any).qtd_filhos_meninas || ""));
      setCongregaGileade((data as any).congrega_gileade !== false ? "sim" : "nao");
      setOndeCongrega((data as any).onde_congrega || "");
      setCep((data as any).cep || "");
      setEndereco((data as any).endereco || "");
      setNumero((data as any).numero_endereco || "");
      setComplemento((data as any).complemento || "");
      setBairro((data as any).bairro || "");
      setCidade((data as any).cidade || "");
      setEstado((data as any).estado || "");
      setFrequentaCR((data as any).casa_refugio_id ? "sim" : "nao");
      setCasaRefugioId((data as any).casa_refugio_id || null);
      setObservacoes(data.observacoes || "");

      // Load filhos
      const { data: filhosData } = await supabase
        .from("casais_inscritos_filhos")
        .select("*")
        .eq("inscricao_id", editingId)
        .order("created_at");
      if (filhosData) {
        setFilhos(filhosData.map((f) => ({
          id: f.id,
          nome: f.nome,
          idade: String(f.idade || ""),
          genero: f.genero || "masculino",
          member_id: f.member_id,
        })));
      }
    };
    loadData();
  }, [editingId, open]);

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const totalFilhos = (parseInt(qtdMeninos) || 0) + (parseInt(qtdMeninas) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Editar Inscrição" : "Nova Inscrição de Casal"}</DialogTitle>
          <DialogDescription>Preencha todos os dados do casal para inscrição completa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Turma removida - será atribuída na aprovação */}

          {/* Esposo */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Dados do Esposo</h3>
            <div className="space-y-2">
              <Label>Buscar membro cadastrado</Label>
              <MemberSelect value={membroMasculinoId} onChange={setMembroMasculinoId} placeholder="Buscar esposo..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo do Esposo *</Label>
                <Input value={nomeMasculino} onChange={(e) => setNomeMasculino(e.target.value)} required placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
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
                <Label>Nome Completo da Esposa *</Label>
                <Input value={nomeFeminino} onChange={(e) => setNomeFeminino(e.target.value)} required placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <MaskedInput mask="phone" value={whatsappFeminino} onChange={setWhatsappFeminino} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={emailFeminino} onChange={(e) => setEmailFeminino(e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Estado Civil e Modalidade */}
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
                <DateInput value={dataModalidade} onChange={(v) => setDataModalidade(v)} maxDate={undefined} />
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
                    <div className="space-y-2">
                      <Label className="text-xs">Vincular a membro cadastrado (opcional)</Label>
                      <MemberSelect
                        value={filho.member_id}
                        onChange={(val) => {
                          updateFilho(index, "member_id", val);
                          if (val && allMembers) {
                            const m = allMembers.find((x) => x.id === val);
                            if (m) updateFilho(index, "nome", m.full_name);
                          }
                        }}
                        placeholder="Buscar filho(a)..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={filho.nome}
                          onChange={(e) => updateFilho(index, "nome", e.target.value)}
                          placeholder="Nome do(a) filho(a)"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Idade</Label>
                        <Input
                          type="number"
                          min="0"
                          value={filho.idade}
                          onChange={(e) => updateFilho(index, "idade", e.target.value)}
                          placeholder="Idade"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Congrega em Gileade */}
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
                <Label>Onde congrega? (Pode deixar em branco se não congregar)</Label>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Salvar Alterações" : "Realizar Inscrição"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
