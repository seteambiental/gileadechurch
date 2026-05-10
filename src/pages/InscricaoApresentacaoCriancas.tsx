import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Calendar, Clock, MapPin, Check, Home, UserPlus, Search, Baby } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { MemberRequestForm } from "@/components/MemberRequestForm";

interface Evento {
  id: string;
  titulo: string;
  data_evento: string;
  hora_inicio: string | null;
  local: string | null;
  cor: string | null;
  flyer_url: string | null;
  tipo_evento: string;
}

interface Responsavel {
  id: string;
  full_name: string;
  origem: "member" | "request";
  status: string;
}

type SelecionadoTipo = "member" | "request";

interface Selecionado {
  id: string;
  full_name: string;
  tipo: SelecionadoTipo;
}

const ResponsavelPicker = ({
  label,
  selecionado,
  onSelecionar,
  abrirCadastro,
  responsaveis,
  isLoading,
  termo,
  setTermo,
}: {
  label: string;
  selecionado: Selecionado | null;
  onSelecionar: (s: Selecionado | null) => void;
  abrirCadastro: () => void;
  responsaveis: Responsavel[];
  isLoading: boolean;
  termo: string;
  setTermo: (t: string) => void;
}) => {
  if (selecionado) {
    return (
      <div className="space-y-2">
        <Label className="font-semibold">{label}</Label>
        <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary bg-primary/5">
          <div>
            <p className="font-medium">{selecionado.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {selecionado.tipo === "request"
                ? "Cadastro pendente de aprovação"
                : "Membro Gileade"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelecionar(null)}>
            Trocar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="font-semibold">{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Digite o nome..."
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          className="pl-9"
        />
      </div>
      {termo.trim().length >= 2 && (
        <div className="border rounded-lg max-h-56 overflow-y-auto bg-background">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
            </div>
          ) : responsaveis.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              Nenhum cadastro encontrado.
            </div>
          ) : (
            responsaveis.map((r) => (
              <button
                key={`${r.origem}-${r.id}`}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                onClick={() => {
                  onSelecionar({ id: r.id, full_name: r.full_name, tipo: r.origem });
                  setTermo("");
                }}
              >
                <div className="font-medium">{r.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.origem === "request"
                    ? `Solicitação ${r.status}`
                    : "Membro Gileade"}
                </div>
              </button>
            ))
          )}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={abrirCadastro}
        className="w-full"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Não encontrei: cadastrar agora
      </Button>
    </div>
  );
};

const InscricaoApresentacaoCriancas = () => {
  const { eventoId } = useParams<{ eventoId: string }>();
  const { toast } = useToast();

  const [pai, setPai] = useState<Selecionado | null>(null);
  const [mae, setMae] = useState<Selecionado | null>(null);
  const [termoPai, setTermoPai] = useState("");
  const [termoMae, setTermoMae] = useState("");
  const [criancaNome, setCriancaNome] = useState("");
  const [criancaData, setCriancaData] = useState("");
  const [criancaGenero, setCriancaGenero] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [cadastroAberto, setCadastroAberto] = useState<null | "pai" | "mae">(null);
  const [enviado, setEnviado] = useState(false);

  // Track newly created request to auto-select after dialog closes
  const [pendingAutoSelect, setPendingAutoSelect] = useState<{
    target: "pai" | "mae";
    info: { requestId: string; fullName: string; conjugeRequestId?: string | null; conjugeFullName?: string | null };
  } | null>(null);

  const { data: evento, isLoading: loadingEvento } = useQuery({
    queryKey: ["evento-apresentacao", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, hora_inicio, local, cor, flyer_url, tipo_evento")
        .eq("id", eventoId)
        .single();
      if (error) throw error;
      return data as Evento;
    },
    enabled: !!eventoId,
  });

  const buscarResponsaveis = async (termo: string): Promise<Responsavel[]> => {
    if (termo.trim().length < 2) return [];
    const { data, error } = await supabase.rpc("buscar_responsaveis_publico", { termo });
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []) as Responsavel[];
  };

  const { data: respPai = [], isLoading: loadingPai } = useQuery({
    queryKey: ["resp-pai", termoPai],
    queryFn: () => buscarResponsaveis(termoPai),
    enabled: termoPai.trim().length >= 2,
  });
  const { data: respMae = [], isLoading: loadingMae } = useQuery({
    queryKey: ["resp-mae", termoMae],
    queryFn: () => buscarResponsaveis(termoMae),
    enabled: termoMae.trim().length >= 2,
  });

  // After cadastro dialog closes, auto-select the newly created person
  useEffect(() => {
    if (!pendingAutoSelect || cadastroAberto !== null) return;
    const { target, info } = pendingAutoSelect;
    const sel: Selecionado = {
      id: info.requestId,
      full_name: info.fullName,
      tipo: "request",
    };
    if (target === "pai") {
      setPai(sel);
      // If a conjuge was created and "mae" is empty, auto-fill it
      if (info.conjugeRequestId && info.conjugeFullName && !mae) {
        setMae({
          id: info.conjugeRequestId,
          full_name: info.conjugeFullName,
          tipo: "request",
        });
      }
    } else {
      setMae(sel);
      if (info.conjugeRequestId && info.conjugeFullName && !pai) {
        setPai({
          id: info.conjugeRequestId,
          full_name: info.conjugeFullName,
          tipo: "request",
        });
      }
    }
    setPendingAutoSelect(null);
  }, [cadastroAberto, pendingAutoSelect, mae, pai]);

  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (!evento) throw new Error("Evento não encontrado");
      if (!pai && !mae) throw new Error("Informe ao menos um responsável (pai ou mãe)");
      if (!criancaNome.trim()) throw new Error("Informe o nome da criança");

      const payload = {
        evento_id: evento.id,
        pai_member_id: pai?.tipo === "member" ? pai.id : null,
        pai_request_id: pai?.tipo === "request" ? pai.id : null,
        pai_nome: pai?.full_name ?? null,
        mae_member_id: mae?.tipo === "member" ? mae.id : null,
        mae_request_id: mae?.tipo === "request" ? mae.id : null,
        mae_nome: mae?.full_name ?? null,
        crianca_nome: criancaNome.trim(),
        crianca_data_nascimento: criancaData || null,
        crianca_genero: criancaGenero || null,
        observacoes: observacoes.trim() || null,
      };
      const { error } = await (supabase as any)
        .from("apresentacao_criancas_inscricoes")
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

  if (loadingEvento) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground">Evento não encontrado.</p>
        <Link to="/">
          <Button variant="outline">
            <Home className="w-4 h-4 mr-2" /> Página inicial
          </Button>
        </Link>
      </div>
    );
  }

  const cor = evento.cor || "#dc2626";

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
              A inscrição da apresentação de <strong>{criancaNome}</strong> foi registrada.
              Caso tenha cadastrado novos membros, eles passarão por aprovação da liderança.
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
        style={{ background: `linear-gradient(135deg, ${cor} 0%, hsl(0 0% 0%) 100%)` }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <img src={logoGileade} alt="Gileade" className="w-14 h-14 rounded-lg shadow-lg" />
          <div className="text-white">
            <p className="text-xs uppercase tracking-wider opacity-80">Apresentação de Crianças</p>
            <h1 className="font-heading font-bold text-xl sm:text-2xl">{evento.titulo}</h1>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {evento.flyer_url && (
          <img
            src={evento.flyer_url}
            alt={evento.titulo}
            className="w-full rounded-xl border"
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(parseLocalDate(evento.data_evento), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {evento.hora_inicio && (
              <p className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> {evento.hora_inicio.substring(0, 5)}
              </p>
            )}
            {evento.local && (
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" /> {evento.local}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Baby className="w-5 h-5" /> Dados da apresentação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ResponsavelPicker
              label="Pai"
              selecionado={pai}
              onSelecionar={setPai}
              abrirCadastro={() => setCadastroAberto("pai")}
              responsaveis={respPai}
              isLoading={loadingPai}
              termo={termoPai}
              setTermo={setTermoPai}
            />

            <ResponsavelPicker
              label="Mãe"
              selecionado={mae}
              onSelecionar={setMae}
              abrirCadastro={() => setCadastroAberto("mae")}
              responsaveis={respMae}
              isLoading={loadingMae}
              termo={termoMae}
              setTermo={setTermoMae}
            />

            <div className="border-t pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="font-semibold">Nome completo da criança *</Label>
                <Input
                  value={criancaNome}
                  onChange={(e) => setCriancaNome(e.target.value)}
                  placeholder="Nome da criança a ser apresentada"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data de nascimento</Label>
                  <Input
                    type="date"
                    value={criancaData}
                    onChange={(e) => setCriancaData(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={criancaGenero} onValueChange={setCriancaGenero}>
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
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Algo que a equipe precisa saber..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={() => enviarMutation.mutate()}
          disabled={enviarMutation.isPending}
        >
          {enviarMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Enviar inscrição
        </Button>
      </main>

      <MemberRequestForm
        open={cadastroAberto !== null}
        onOpenChange={(open) => {
          if (!open) setCadastroAberto(null);
        }}
        onCreated={(info) => {
          if (cadastroAberto) {
            setPendingAutoSelect({ target: cadastroAberto, info });
          }
        }}
      />
    </div>
  );
};

export default InscricaoApresentacaoCriancas;