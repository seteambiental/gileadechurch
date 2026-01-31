import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, Clock, MapPin, Check, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoGileade from "@/assets/logo-gileade.jpeg";
import { formatPhone, formatCPF } from "@/lib/masks";
import { includesNormalized } from "@/lib/text-utils";

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  data_fim: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  tipo_evento: string;
  cor: string | null;
  flyer_url: string | null;
  tem_custo: boolean | null;
  valor_custo: number | null;
  limite_vagas: number | null;
}

interface PessoaBusca {
  id: string;
  full_name: string;
  whatsapp: string | null;
  genero: string | null;
  tipo_pessoa: "member" | "convertido";
}

const InscricaoEvento = () => {
  const { eventoId } = useParams<{ eventoId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Fullscreen mode for totem
  const [isFullscreen, setIsFullscreen] = useState(searchParams.get("fullscreen") === "true");

  // Form state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<{ type: "member" | "convertido" | "novo"; id?: string } | null>(null);
  const [nomeParticipante, setNomeParticipante] = useState("");
  const [genero, setGenero] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [telefoneEmergencia, setTelefoneEmergencia] = useState("");
  const [isMenor, setIsMenor] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [telefoneResponsavel, setTelefoneResponsavel] = useState("");
  const [preferenciaBeliche, setPreferenciaBeliche] = useState("indiferente");
  const [temAlergia, setTemAlergia] = useState(false);
  const [descricaoAlergia, setDescricaoAlergia] = useState("");
  const [tomaMedicamento, setTomaMedicamento] = useState(false);
  const [descricaoMedicamento, setDescricaoMedicamento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [inscricaoRealizada, setInscricaoRealizada] = useState(false);
  const [membroMinisterio, setMembroMinisterio] = useState<"gileade" | "outro" | "nenhum" | "">("");
  const [outroMinisterio, setOutroMinisterio] = useState("");
  const [cpf, setCpf] = useState("");

  // Toggle browser fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Fetch evento
  const { data: evento, isLoading: eventoLoading } = useQuery({
    queryKey: ["evento-inscricao", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("*")
        .eq("id", eventoId)
        .single();
      if (error) throw error;
      return data as Evento;
    },
    enabled: !!eventoId,
  });

  // Fetch inscriptions count for this event (excluding waiting list)
  const { data: inscricoesCount = 0 } = useQuery({
    queryKey: ["inscricoes-count", eventoId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("inscricoes_eventos")
        .select("*", { count: "exact", head: true })
        .eq("evento_id", eventoId)
        .eq("lista_espera", false)
        .neq("status_pagamento", "cancelado");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!eventoId,
  });

  const vagasDisponiveis = evento?.limite_vagas 
    ? Math.max(0, evento.limite_vagas - inscricoesCount) 
    : null;
  const esgotado = vagasDisponiveis !== null && vagasDisponiveis <= 0;

  // Fetch pessoas para busca - usando view pública que une members e novos_convertidos
  const { data: pessoas = [] } = useQuery({
    queryKey: ["pessoas-inscricao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricao_pessoas_busca" as any)
        .select("id, full_name, whatsapp, genero, tipo_pessoa")
        .order("full_name");
      if (error) throw error;
      return (data as unknown) as PessoaBusca[];
    },
  });

  // Filter search results
  const searchResults = searchTerm.length >= 2 
    ? pessoas.filter(p => includesNormalized(p.full_name, searchTerm))
    : [];

  // Handle person selection
  const handleSelectPerson = (person: PessoaBusca) => {
    setSelectedPerson({ type: person.tipo_pessoa, id: person.id });
    setNomeParticipante(person.full_name);
    setTelefoneContato(person.whatsapp || "");
    setGenero(person.genero || "");
    setShowSearch(false);
    setSearchTerm("");
  };

  // Handle new person
  const handleNewPerson = () => {
    setSelectedPerson({ type: "novo" });
    setShowSearch(false);
  };

  // Mutation to create inscription
  const inscricaoMutation = useMutation({
    mutationFn: async () => {
      // Verificar novamente se há vagas (para evitar race condition)
      const isListaEspera = esgotado;
      
      // Montar observação com info do ministério
      let observacoesMinisterio = "";
      if (membroMinisterio === "gileade") {
        observacoesMinisterio = "Membro de Gileade";
      } else if (membroMinisterio === "outro") {
        observacoesMinisterio = `Membro de outro ministério: ${outroMinisterio}`;
      } else if (membroMinisterio === "nenhum") {
        observacoesMinisterio = "Não é membro de nenhum ministério";
      }

      const payload = {
        evento_id: eventoId,
        member_id: selectedPerson?.type === "member" ? selectedPerson.id : null,
        novo_convertido_id: selectedPerson?.type === "convertido" ? selectedPerson.id : null,
        nome_participante: nomeParticipante,
        genero,
        telefone_contato: telefoneContato,
        telefone_emergencia: telefoneEmergencia || null,
        is_menor: isMenor,
        nome_responsavel: isMenor ? nomeResponsavel : null,
        telefone_responsavel: isMenor ? telefoneResponsavel : null,
        preferencia_beliche: preferenciaBeliche,
        tem_alergia_alimentar: temAlergia,
        descricao_alergia: temAlergia ? descricaoAlergia : null,
        toma_medicamento: tomaMedicamento,
        descricao_medicamento: tomaMedicamento ? descricaoMedicamento : null,
        forma_pagamento: formaPagamento,
        lista_espera: isListaEspera,
        observacoes: observacoesMinisterio || null,
        cpf: cpf ? cpf.replace(/\D/g, "") : null,
      };

      const { data: inscricaoData, error } = await supabase
        .from("inscricoes_eventos")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Enviar confirmação por WhatsApp automaticamente
      try {
        await supabase.functions.invoke('enviar-whatsapp', {
          body: {
            action: 'confirmacao_inscricao',
            inscricaoId: inscricaoData.id,
            evento: {
              titulo: evento?.titulo,
              data_evento: evento?.data_evento,
              hora_inicio: evento?.hora_inicio,
              local: evento?.local,
            },
          },
        });
      } catch (whatsappError) {
        console.error('Erro ao enviar WhatsApp:', whatsappError);
        // Não bloqueia a inscrição se o WhatsApp falhar
      }

      return inscricaoData;
    },
    onSuccess: () => {
      setInscricaoRealizada(true);
      toast({
        title: "Inscrição realizada!",
        description: "Sua inscrição foi registrada e uma confirmação foi enviada por WhatsApp.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na inscrição",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nomeParticipante || !telefoneContato || !formaPagamento) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, telefone e forma de pagamento.",
        variant: "destructive",
      });
      return;
    }

    if (isMenor && (!nomeResponsavel || !telefoneResponsavel)) {
      toast({
        title: "Campos obrigatórios",
        description: "Para menores, informe o nome e telefone do responsável.",
        variant: "destructive",
      });
      return;
    }

    inscricaoMutation.mutate();
  };

  if (eventoLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Evento não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inscricaoRealizada) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Inscrição Confirmada!</h2>
            <p className="text-muted-foreground">
              Sua inscrição para <strong>{evento.titulo}</strong> foi realizada com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              Em breve você receberá mais informações pelo WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-background to-muted/30 ${isFullscreen ? 'p-4' : ''}`}>
      {/* Header - Otimizado para tablet/totem - Escondido em fullscreen */}
      {!isFullscreen && (
        <header className="bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4 md:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logoGileade} alt="Gileade" className="w-10 h-10 md:w-14 md:h-14 rounded-full object-cover" />
                <span className="font-heading font-bold text-lg md:text-2xl">Igreja Gileade</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="hidden md:flex"
                title="Modo Tela Cheia"
              >
                <Maximize2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Fullscreen exit button */}
      {isFullscreen && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="fixed top-4 right-4 z-50"
        >
          <Minimize2 className="w-4 h-4 mr-2" />
          Sair Tela Cheia
        </Button>
      )}

      <main className={`container mx-auto px-4 py-6 md:py-10 max-w-3xl ${isFullscreen ? 'pt-16' : ''}`}>
        {/* Event Info Card - Layout otimizado para tablet */}
        <Card className="mb-6 md:mb-8 overflow-hidden">
          {evento.flyer_url && (
            <div className="h-48 md:h-64">
              <img src={evento.flyer_url} alt={evento.titulo} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="h-1 md:h-2" style={{ backgroundColor: evento.cor || "#dc2626" }} />
          <CardHeader className="md:p-8">
            <CardTitle className="text-xl md:text-3xl">{evento.titulo}</CardTitle>
            <div className="flex flex-wrap gap-3 md:gap-6 text-sm md:text-lg text-muted-foreground mt-2 md:mt-4">
              <span className="flex items-center gap-1 md:gap-2">
                <Calendar className="w-4 h-4 md:w-6 md:h-6" />
                {format(parseISO(evento.data_evento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                {evento.data_fim && evento.data_fim !== evento.data_evento && (
                  <> a {format(parseISO(evento.data_fim), "dd 'de' MMMM", { locale: ptBR })}</>
                )}
              </span>
              {evento.hora_inicio && (
                <span className="flex items-center gap-1 md:gap-2">
                  <Clock className="w-4 h-4 md:w-6 md:h-6" />
                  {evento.hora_inicio.substring(0, 5)}
                </span>
              )}
              {evento.local && (
                <span className="flex items-center gap-1 md:gap-2">
                  <MapPin className="w-4 h-4 md:w-6 md:h-6" />
                  {evento.local}
                </span>
              )}
            </div>
            {evento.descricao && (
              <p className="text-sm md:text-base text-muted-foreground mt-2 md:mt-4">{evento.descricao}</p>
            )}
            {evento.tem_custo && evento.valor_custo && (
              <p className="text-sm md:text-lg font-medium mt-2 md:mt-4">
                Investimento: R$ {evento.valor_custo.toFixed(2).replace(".", ",")}
              </p>
            )}
            {evento.limite_vagas && (
              <div className={`mt-3 md:mt-4 p-3 md:p-4 rounded-lg ${esgotado ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                <p className={`text-sm md:text-base font-medium ${esgotado ? 'text-destructive' : 'text-green-600'}`}>
                  {esgotado 
                    ? "⚠️ Vagas esgotadas!" 
                    : `✅ ${vagasDisponiveis} vaga${vagasDisponiveis !== 1 ? 's' : ''} disponíve${vagasDisponiveis !== 1 ? 'is' : 'l'}`
                  }
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {inscricoesCount} de {evento.limite_vagas} inscritos
                </p>
              </div>
            )}
          </CardHeader>
        </Card>

        {esgotado ? (
          <Card className="mb-4 md:mb-6">
            <CardHeader className="md:p-8">
              <CardTitle className="text-lg md:text-xl">Vagas esgotadas - Lista de Espera</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:p-8 md:pt-0">
              <div className="p-4 md:p-6 bg-orange-500/10 rounded-lg">
                <p className="text-orange-600 font-medium text-base md:text-lg">
                  ⏳ As vagas para este evento estão esgotadas.
                </p>
                <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                  Você pode se inscrever na lista de espera. Caso algum participante desista, você será notificado automaticamente por WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="md:p-8">
            <CardTitle className="text-lg md:text-2xl">
              {esgotado ? "Inscrição na Lista de Espera" : "Formulário de Inscrição"}
            </CardTitle>
          </CardHeader>
          <CardContent className="md:p-8 md:pt-0">
            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              {/* Search for existing person */}
              {showSearch && (
                <div className="space-y-4 md:space-y-6">
                  <div className="space-y-2 md:space-y-3">
                    <Label className="text-base md:text-lg">Buscar cadastro existente</Label>
                    <SearchInput
                      placeholder="Digite seu nome para buscar..."
                      value={searchTerm}
                      onChange={setSearchTerm}
                      className="h-10 md:h-14 text-base md:text-lg"
                    />
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-48 md:max-h-64 overflow-y-auto">
                        {searchResults.map((person) => (
                          <button
                            key={`${person.tipo_pessoa}-${person.id}`}
                            type="button"
                            className="w-full px-3 md:px-4 py-2 md:py-4 text-left hover:bg-muted/50 flex items-center justify-between text-base md:text-lg"
                            onClick={() => handleSelectPerson(person)}
                          >
                            <span>{person.full_name}</span>
                            <span className="text-xs md:text-sm text-muted-foreground">
                              {person.tipo_pessoa === "member" ? "Membro" : "Consolidação"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchTerm.length >= 2 && searchResults.length === 0 && (
                      <p className="text-sm md:text-base text-muted-foreground">
                        Nenhum cadastro encontrado.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t" />
                    <span className="text-sm md:text-base text-muted-foreground">ou</span>
                    <div className="flex-1 border-t" />
                  </div>
                  <Button type="button" variant="outline" className="w-full h-12 md:h-16 text-base md:text-lg" onClick={handleNewPerson}>
                    Sou novo participante
                  </Button>
                </div>
              )}

              {/* Form fields */}
              {!showSearch && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSearch(true);
                      setSelectedPerson(null);
                      setNomeParticipante("");
                      setGenero("");
                      setTelefoneContato("");
                    }}
                  >
                    ← Voltar para busca
                  </Button>

                  <div className="grid gap-4 md:gap-6">
                    <div className="space-y-2 md:space-y-3">
                      <Label htmlFor="nome" className="text-base md:text-lg">Nome Completo *</Label>
                      <Input
                        id="nome"
                        value={nomeParticipante}
                        onChange={(e) => setNomeParticipante(e.target.value)}
                        placeholder="Seu nome completo"
                        required
                        className="h-10 md:h-14 text-base md:text-lg"
                      />
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <Label className="text-base md:text-lg">Gênero</Label>
                      <Select value={genero} onValueChange={setGenero}>
                        <SelectTrigger className="h-10 md:h-14 text-base md:text-lg">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino" className="text-base md:text-lg py-2 md:py-3">Masculino</SelectItem>
                          <SelectItem value="feminino" className="text-base md:text-lg py-2 md:py-3">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <Label htmlFor="telefone" className="text-base md:text-lg">Telefone para Contato *</Label>
                      <Input
                        id="telefone"
                        value={telefoneContato}
                        onChange={(e) => setTelefoneContato(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        required
                        className="h-10 md:h-14 text-base md:text-lg"
                      />
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <Label htmlFor="emergencia" className="text-base md:text-lg">Telefone de Emergência</Label>
                      <Input
                        id="emergencia"
                        value={telefoneEmergencia}
                        onChange={(e) => setTelefoneEmergencia(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="h-10 md:h-14 text-base md:text-lg"
                      />
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <Label htmlFor="cpf" className="text-base md:text-lg">CPF</Label>
                      <Input
                        id="cpf"
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        className="h-10 md:h-14 text-base md:text-lg"
                        maxLength={14}
                      />
                    </div>

                    {/* Membro de ministério */}
                    <div className="space-y-2 md:space-y-3">
                      <Label className="text-base md:text-lg">É membro de Gileade ou de outro ministério?</Label>
                      <RadioGroup value={membroMinisterio} onValueChange={(v) => setMembroMinisterio(v as "gileade" | "outro" | "nenhum")} className="space-y-2 md:space-y-3">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="gileade" id="gileade" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="gileade" className="font-normal text-base md:text-lg">Sim, sou membro de Gileade</Label>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="outro" id="outro-ministerio" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="outro-ministerio" className="font-normal text-base md:text-lg">Sim, de outro ministério</Label>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="nenhum" id="nenhum-ministerio" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="nenhum-ministerio" className="font-normal text-base md:text-lg">Não sou membro de nenhum ministério</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {membroMinisterio === "outro" && (
                      <div className="space-y-2 md:space-y-3 p-4 md:p-6 bg-muted/30 rounded-lg">
                        <Label htmlFor="outroMinisterio" className="text-base md:text-lg">Qual ministério?</Label>
                        <Input
                          id="outroMinisterio"
                          value={outroMinisterio}
                          onChange={(e) => setOutroMinisterio(e.target.value)}
                          placeholder="Nome do ministério"
                          className="h-10 md:h-14 text-base md:text-lg"
                        />
                      </div>
                    )}

                    {/* Menor de idade */}
                    <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                      <Label htmlFor="menor" className="text-base md:text-lg">É menor de idade?</Label>
                      <Switch
                        id="menor"
                        checked={isMenor}
                        onCheckedChange={setIsMenor}
                        className="scale-100 md:scale-125"
                      />
                    </div>

                    {isMenor && (
                      <div className="space-y-4 md:space-y-6 p-4 md:p-6 bg-muted/30 rounded-lg">
                        <div className="space-y-2 md:space-y-3">
                          <Label htmlFor="responsavel" className="text-base md:text-lg">Nome do Pai/Responsável *</Label>
                          <Input
                            id="responsavel"
                            value={nomeResponsavel}
                            onChange={(e) => setNomeResponsavel(e.target.value)}
                            placeholder="Nome do responsável"
                            className="h-10 md:h-14 text-base md:text-lg"
                          />
                        </div>
                        <div className="space-y-2 md:space-y-3">
                          <Label htmlFor="telResponsavel" className="text-base md:text-lg">Telefone do Responsável *</Label>
                          <Input
                            id="telResponsavel"
                            value={telefoneResponsavel}
                            onChange={(e) => setTelefoneResponsavel(formatPhone(e.target.value))}
                            placeholder="(00) 00000-0000"
                            className="h-10 md:h-14 text-base md:text-lg"
                          />
                        </div>
                      </div>
                    )}

                    {/* Preferência beliche */}
                    <div className="space-y-2 md:space-y-3">
                      <Label className="text-base md:text-lg">Preferência de Beliche</Label>
                      <RadioGroup value={preferenciaBeliche} onValueChange={setPreferenciaBeliche} className="space-y-2 md:space-y-3">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="cima" id="cima" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="cima" className="font-normal text-base md:text-lg">Cima</Label>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="baixo" id="baixo" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="baixo" className="font-normal text-base md:text-lg">Baixo</Label>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="indiferente" id="indiferente" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="indiferente" className="font-normal text-base md:text-lg">Indiferente</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Alergia alimentar */}
                    <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                      <Label htmlFor="alergia" className="text-base md:text-lg">Possui alergia alimentar?</Label>
                      <Switch
                        id="alergia"
                        checked={temAlergia}
                        onCheckedChange={setTemAlergia}
                        className="scale-100 md:scale-125"
                      />
                    </div>

                    {temAlergia && (
                      <div className="space-y-2 md:space-y-3">
                        <Label htmlFor="descAlergia" className="text-base md:text-lg">Descreva a alergia</Label>
                        <Textarea
                          id="descAlergia"
                          value={descricaoAlergia}
                          onChange={(e) => setDescricaoAlergia(e.target.value)}
                          placeholder="Descreva sua alergia alimentar..."
                          className="min-h-[80px] md:min-h-[100px] text-base md:text-lg"
                        />
                      </div>
                    )}

                    {/* Medicamento */}
                    <div className="flex items-center justify-between p-3 md:p-4 border rounded-lg">
                      <Label htmlFor="medicamento" className="text-base md:text-lg">Toma algum medicamento?</Label>
                      <Switch
                        id="medicamento"
                        checked={tomaMedicamento}
                        onCheckedChange={setTomaMedicamento}
                        className="scale-100 md:scale-125"
                      />
                    </div>

                    {tomaMedicamento && (
                      <div className="space-y-2 md:space-y-3">
                        <Label htmlFor="descMedicamento" className="text-base md:text-lg">Descreva o medicamento</Label>
                        <Textarea
                          id="descMedicamento"
                          value={descricaoMedicamento}
                          onChange={(e) => setDescricaoMedicamento(e.target.value)}
                          placeholder="Descreva o medicamento que toma..."
                          className="min-h-[80px] md:min-h-[100px] text-base md:text-lg"
                        />
                      </div>
                    )}

                    {/* Forma de pagamento */}
                    <div className="space-y-2 md:space-y-3">
                      <Label className="text-base md:text-lg">Forma de Pagamento *</Label>
                      <RadioGroup value={formaPagamento} onValueChange={setFormaPagamento} className="space-y-2 md:space-y-3">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="pix" id="pix" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="pix" className="font-normal text-base md:text-lg">PIX</Label>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="cartao_credito" id="credito" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="credito" className="font-normal text-base md:text-lg">Cartão de Crédito</Label>
                        </div>
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <RadioGroupItem value="cartao_debito" id="debito" className="w-4 h-4 md:w-6 md:h-6" />
                          <Label htmlFor="debito" className="font-normal text-base md:text-lg">Cartão de Débito</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 md:h-16 text-base md:text-xl"
                    disabled={inscricaoMutation.isPending}
                  >
                    {inscricaoMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 md:w-6 md:h-6 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      esgotado ? "Entrar na Lista de Espera" : "Confirmar Inscrição"
                    )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>Igreja Gileade © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default InscricaoEvento;
