import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MaskedInput } from "@/components/ui/masked-input";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { Loader2, Check, Home, Search, Baby, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCepLookup } from "@/hooks/useCepLookup";
import { formatCep, unformatCep } from "@/lib/masks";
import { toTitleCase, formatNameField } from "@/lib/text-utils";
import { resizeKeepAspect } from "@/lib/image-resize";
import logoGileade from "@/assets/logo-gileade.jpeg";

interface MembroBusca {
  id: string;
  full_name: string;
  origem: "member" | "request";
  status: string;
}

interface PaiSelecionado {
  id: string;
  full_name: string;
}

const MemberSearch = ({
  label,
  selecionado,
  onSelecionar,
  naoIdentificado,
  onNaoIdentificado,
}: {
  label: string;
  selecionado: PaiSelecionado | null;
  onSelecionar: (s: PaiSelecionado | null) => void;
  naoIdentificado: boolean;
  onNaoIdentificado: (v: boolean) => void;
}) => {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<MembroBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  const buscar = async (t: string) => {
    setTermo(t);
    if (t.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const { data } = await (supabase as any).rpc("buscar_responsaveis_publico", { termo: t });
    setResultados(((data || []) as MembroBusca[]).filter((r) => r.origem === "member"));
    setBuscando(false);
  };

  return (
    <div className="space-y-2">
      <Label className="font-semibold">{label}</Label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={naoIdentificado}
          onCheckedChange={(c) => {
            const v = c === true;
            onNaoIdentificado(v);
            if (v) onSelecionar(null);
          }}
        />
        Não identificado / não informar
      </label>

      {!naoIdentificado && (
        selecionado ? (
          <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary bg-primary/5">
            <p className="font-medium">{selecionado.full_name}</p>
            <Button variant="ghost" size="sm" onClick={() => onSelecionar(null)}>
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar membro pelo nome..."
                value={termo}
                onChange={(e) => buscar(e.target.value)}
                className="pl-9"
              />
            </div>
            {termo.trim().length >= 2 && (
              <div className="border rounded-lg max-h-56 overflow-y-auto bg-background">
                {buscando ? (
                  <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                  </div>
                ) : resultados.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    Nenhum membro encontrado.
                  </div>
                ) : (
                  resultados.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                      onClick={() => {
                        onSelecionar({ id: r.id, full_name: r.full_name });
                        setTermo("");
                        setResultados([]);
                      }}
                    >
                      {r.full_name}
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};

const FreeText = ({
  label,
  value,
  onChange,
  naoIdentificado,
  onNaoIdentificado,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  naoIdentificado: boolean;
  onNaoIdentificado: (v: boolean) => void;
}) => (
  <div className="space-y-2">
    <Label className="font-semibold">{label}</Label>
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Checkbox
        checked={naoIdentificado}
        onCheckedChange={(c) => {
          const v = c === true;
          onNaoIdentificado(v);
          if (v) onChange("");
        }}
      />
      Não identificado / não informar
    </label>
    {!naoIdentificado && (
      <Input
        placeholder="Nome completo"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </div>
);

const InscricaoApresentacaoPublica = () => {
  const { toast } = useToast();

  const [familiaMembro, setFamiliaMembro] = useState<"" | "sim" | "nao">("");

  const [paiMembro, setPaiMembro] = useState<PaiSelecionado | null>(null);
  const [maeMembro, setMaeMembro] = useState<PaiSelecionado | null>(null);
  const [paiNome, setPaiNome] = useState("");
  const [maeNome, setMaeNome] = useState("");
  const [paiNaoId, setPaiNaoId] = useState(false);
  const [maeNaoId, setMaeNaoId] = useState(false);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [dataNasc, setDataNasc] = useState("");
  const [genero, setGenero] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [observacoes, setObservacoes] = useState("");
  const [enviado, setEnviado] = useState(false);

  const { isLoading: cepLoading } = useCepLookup(cep, (data) => {
    setAddress(data.address);
    setNeighborhood(data.neighborhood);
    setCity(data.city);
    setState(data.state);
  });

  const handlePhoto = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da criança");
      const ehMembro = familiaMembro === "sim";

      const paiInformado = ehMembro ? !!paiMembro : !!paiNome.trim();
      const maeInformado = ehMembro ? !!maeMembro : !!maeNome.trim();
      if (!paiNaoId && !maeNaoId && !paiInformado && !maeInformado) {
        throw new Error("Informe ao menos um dos responsáveis (pai ou mãe)");
      }

      // Upload da foto
      let photoUrl: string | null = null;
      if (photoFile) {
        const { file } = await resizeKeepAspect(photoFile, 1200);
        const fileName = `apresentacao_${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("member-photos")
          .upload(fileName, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("member-photos")
          .getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      const payload = {
        familia_membro: ehMembro,
        pai_member_id: ehMembro ? paiMembro?.id ?? null : null,
        pai_nome: ehMembro ? paiMembro?.full_name ?? null : (paiNome.trim() ? formatNameField(paiNome) : null),
        pai_nao_identificado: paiNaoId,
        mae_member_id: ehMembro ? maeMembro?.id ?? null : null,
        mae_nome: ehMembro ? maeMembro?.full_name ?? null : (maeNome.trim() ? formatNameField(maeNome) : null),
        mae_nao_identificado: maeNaoId,
        crianca_nome: formatNameField(nome),
        crianca_cpf: cpf.replace(/\D/g, "") || null,
        crianca_rg: rg.replace(/\D/g, "") || null,
        crianca_data_nascimento: dataNasc || null,
        crianca_genero: genero || null,
        crianca_photo_url: photoUrl,
        cep: cep ? unformatCep(cep) : null,
        address: address ? toTitleCase(address) : null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood ? toTitleCase(neighborhood) : null,
        city: city ? toTitleCase(city) : null,
        state: state ? state.toUpperCase() : null,
        observacoes: observacoes.trim() || null,
      };

      const { error } = await (supabase as any)
        .from("apresentacao_criancas")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setEnviado(true);
      toast({ title: "Inscrição enviada!", description: "Recebemos os dados da apresentação." });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  if (enviado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-heading font-bold text-2xl">Inscrição recebida!</h2>
            <p className="text-muted-foreground text-sm">
              A inscrição da apresentação de <strong>{nome}</strong> foi registrada com sucesso.
              A equipe entrará em contato com mais informações.
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" /> Voltar à página inicial
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="w-full py-6 px-4"
        style={{ background: "linear-gradient(135deg, #dc2626 0%, hsl(0 0% 0%) 100%)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <img src={logoGileade} alt="Gileade" className="w-14 h-14 rounded-lg shadow-lg" />
          <div className="text-white">
            <p className="text-xs uppercase tracking-wider opacity-80">Gileade Church</p>
            <h1 className="font-heading font-bold text-xl sm:text-2xl">Apresentação de Crianças</h1>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" /> A família é membro da Gileade?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={familiaMembro} onValueChange={(v) => setFamiliaMembro(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim, somos membros</SelectItem>
                <SelectItem value="nao">Não somos membros</SelectItem>
              </SelectContent>
            </Select>
            {familiaMembro === "sim" && (
              <p className="text-xs text-muted-foreground mt-2">
                Como são membros, busque o nome dos pais no cadastro. A criança poderá ser
                incluída no cadastro de membros pela equipe.
              </p>
            )}
          </CardContent>
        </Card>

        {familiaMembro && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Responsáveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {familiaMembro === "sim" ? (
                  <>
                    <MemberSearch
                      label="Pai"
                      selecionado={paiMembro}
                      onSelecionar={setPaiMembro}
                      naoIdentificado={paiNaoId}
                      onNaoIdentificado={setPaiNaoId}
                    />
                    <MemberSearch
                      label="Mãe"
                      selecionado={maeMembro}
                      onSelecionar={setMaeMembro}
                      naoIdentificado={maeNaoId}
                      onNaoIdentificado={setMaeNaoId}
                    />
                  </>
                ) : (
                  <>
                    <FreeText
                      label="Pai"
                      value={paiNome}
                      onChange={setPaiNome}
                      naoIdentificado={paiNaoId}
                      onNaoIdentificado={setPaiNaoId}
                    />
                    <FreeText
                      label="Mãe"
                      value={maeNome}
                      onChange={setMaeNome}
                      naoIdentificado={maeNaoId}
                      onNaoIdentificado={setMaeNaoId}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Baby className="w-5 h-5" /> Dados da criança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-3 pb-2">
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="Foto da criança"
                      className="w-28 h-28 rounded-full object-cover border-2 border-primary"
                    />
                  )}
                  <CameraPhotoInput
                    onPhotoCapture={handlePhoto}
                    photoPreview={photoPreview}
                    buttonLabel="Foto da criança"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Nome completo da criança *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da criança" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <MaskedInput mask="cpf" value={cpf} onChange={setCpf} />
                  </div>
                  <div className="space-y-2">
                    <Label>RG</Label>
                    <MaskedInput mask="rg" value={rg} onChange={setRg} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data de nascimento</Label>
                    <Input type="date" value={dataNasc} onChange={(e) => setDataNasc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gênero</Label>
                    <Select value={genero} onValueChange={setGenero}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input
                        value={cep}
                        onChange={(e) => setCep(formatCep(e.target.value))}
                        placeholder="00000-000"
                      />
                      {cepLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={number} onChange={(e) => setNumber(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={complement} onChange={(e) => setComplement(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Algo que a equipe precisa saber..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={() => enviarMutation.mutate()}
              disabled={enviarMutation.isPending}
            >
              {enviarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar inscrição
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default InscricaoApresentacaoPublica;
