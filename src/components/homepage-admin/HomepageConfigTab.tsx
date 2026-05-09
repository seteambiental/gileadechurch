import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Settings, Building2, ExternalLink, Phone, Mail, MapPin, Globe, Clock, Cake, Save, Loader2, MessageSquare, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

type TipoMensagem =
  | "confirmacao_inscricao"
  | "inscricao_recebida"
  | "lembrete_pagamento"
  | "vaga_liberada"
  | "contato_emergencia";

const TIPOS_MENSAGEM: { value: TipoMensagem; label: string; descricao: string }[] = [
  { value: "confirmacao_inscricao", label: "Confirmação de inscrição", descricao: "Enviada quando o ADM confirma a inscrição" },
  { value: "inscricao_recebida", label: "Inscrição recebida", descricao: "Enviada automaticamente ao se inscrever" },
  { value: "lembrete_pagamento", label: "Lembrete de pagamento", descricao: "Enviada para quem está com pagamento pendente" },
  { value: "vaga_liberada", label: "Vaga liberada (lista de espera)", descricao: "Enviada quando uma vaga é liberada" },
  { value: "contato_emergencia", label: "Contato de Emergência", descricao: "Mensagem recorrente enviada ao contato de emergência do participante" },
];

const TEMPLATES_PADRAO: Record<TipoMensagem, string> = {
  confirmacao_inscricao: `✅ *INSCRIÇÃO CONFIRMADA!*

Olá, {NOME}! 👋

Sua inscrição para *{EVENTO}* foi recebida com sucesso!

📅 *Data:* {DATA}
📍 *Local:* {LOCAL}

Em breve entraremos em contato com mais detalhes.

Deus abençoe! 🙏

_Igreja Gileade_ 💙`,
  inscricao_recebida: `🙏 *Olá, {NOME}!*

Somos da *Gileade Church*.

Recebemos a sua inscrição para *{EVENTO}*. Lembre-se que para garantir a sua vaga, é preciso efetuar o pagamento do valor da inscrição.

Dúvidas, por favor, chame nesse número! 💙

_Igreja Gileade_`,
  lembrete_pagamento: `⏰ *LEMBRETE DE PAGAMENTO*

Olá, {NOME}! 👋

Notamos que sua inscrição para *{EVENTO}* ainda está com pagamento pendente.

📅 *Data:* {DATA}
📍 *Local:* {LOCAL}

Por favor, regularize seu pagamento para garantir sua vaga! 🙏

_Igreja Gileade_ 💙`,
  vaga_liberada: `🎉 *VAGA LIBERADA!*

Olá, {NOME}! 👋

Ótima notícia! Uma vaga foi liberada para *{EVENTO}* e você estava na lista de espera!

✅ Sua inscrição foi automaticamente confirmada!

Deus abençoe! 🙏

_Igreja Gileade_ 💙`,
  contato_emergencia: `🙏 Olá, {NOME_EMERGENCIA}!

Lembrete: {NOME} estará no evento *{EVENTO}* em {DATA_EVENTO}. Qualquer urgência, contaremos com seu apoio como contato de emergência.

_Igreja Gileade_`,
};

const HomepageConfigTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mensagemAniversario, setMensagemAniversario] = useState("");
  const [mensagemCarregada, setMensagemCarregada] = useState(false);

  // Estado da seção "Mensagens de Eventos"
  const [eventoSelecionado, setEventoSelecionado] = useState<string>("");
  const [buscaEvento, setBuscaEvento] = useState<string>("");
  const [tipoMensagemSelecionada, setTipoMensagemSelecionada] = useState<TipoMensagem>("confirmacao_inscricao");
  const [mensagemEvento, setMensagemEvento] = useState<string>("");

  // Estado para configuração de recorrência (somente quando tipo = contato_emergencia)
  type RecCfg = {
    recorrencia_tipo: "dia" | "semana" | "mes";
    recorrencia_dias_semana: number[];
    recorrencia_meses: number[];
    recorrencia_semana_ordinal: "primeiro" | "segundo" | "terceiro" | "quarto" | "ultimo" | "";
    recorrencia_dia_semana: number | null;
    recorrencia_hora: string;
    enviar_recorrente: boolean;
  };
  const REC_DEFAULT: RecCfg = {
    recorrencia_tipo: "semana",
    recorrencia_dias_semana: [],
    recorrencia_meses: [],
    recorrencia_semana_ordinal: "",
    recorrencia_dia_semana: null,
    recorrencia_hora: "08:00",
    enviar_recorrente: true,
  };
  const [recCfg, setRecCfg] = useState<RecCfg>(REC_DEFAULT);

  const { data: homepageConfig, isLoading: loadingHomepage } = useQuery({
    queryKey: ["homepage-config-mensagem"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_config")
        .select("id, mensagem_aniversario")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data && !mensagemCarregada) {
        setMensagemAniversario(data.mensagem_aniversario || "");
        setMensagemCarregada(true);
      }
      return data;
    },
  });

  const { data: igrejaConfig, isLoading: loadingIgreja } = useQuery({
    queryKey: ["igreja-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("igreja_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: eventosRecorrentes, isLoading: loadingEventos } = useQuery({
    queryKey: ["eventos-recorrentes-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, hora_inicio, dia_semana, tipo_evento")
        .eq("ativo", true)
        .eq("recorrente", true)
        .in("tipo_evento", ["culto", "culto_jovens", "culto_teens"])
        .order("dia_semana", { ascending: true });
      if (error) throw error;
      // Deduplica por dia_semana + hora_inicio (mantém o primeiro título)
      // e descarta entradas sem dia_semana ou hora_inicio definidos.
      const seen = new Set<string>();
      const unique: typeof data = [];
      for (const e of data || []) {
        if (e.dia_semana === null || e.dia_semana === undefined) continue;
        if (!e.hora_inicio) continue;
        const key = `${e.dia_semana}-${e.hora_inicio}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(e);
      }
      return unique;
    },
  });

  const salvarMensagem = useMutation({
    mutationFn: async () => {
      if (homepageConfig?.id) {
        const { error } = await supabase
          .from("homepage_config")
          .update({ mensagem_aniversario: mensagemAniversario })
          .eq("id", homepageConfig.id);
        if (error) throw error;
      } else {
        // Criar registro se não existir
        const { error } = await supabase
          .from("homepage_config")
          .insert({ 
            hero_titulo: "Bem-vindo",
            lema: "",
            mensagem_aniversario: mensagemAniversario 
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-config-mensagem"] });
      toast.success("Mensagem de aniversário salva com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar mensagem: " + error.message);
    },
  });

  // ===== Mensagens de Eventos =====
  const { data: eventosAgenda } = useQuery({
    queryKey: ["mensagens-eventos-agenda"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, necessita_inscricao")
        .eq("ativo", true)
        .gte("data_evento", today)
        .order("data_evento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: eventosImpacto } = useQuery({
    queryKey: ["mensagens-eventos-impacto"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("id, nome, data_inicio")
        .gte("data_inicio", today)
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const eventosOptions = useMemo(() => {
    const fmtData = (d: string | null | undefined) => {
      if (!d) return "";
      const [y, m, day] = String(d).split("T")[0].split("-");
      if (!y || !m || !day) return "";
      return `${day}/${m}/${y.slice(2)}`;
    };
    const agenda = (eventosAgenda || []).map((e: any) => ({
      key: `agenda:${e.id}`,
      id: e.id,
      tipo: "agenda" as const,
      label: `📅 ${e.titulo}`,
      titulo: e.titulo,
      data: e.data_evento as string | null,
      dataLabel: fmtData(e.data_evento),
    }));
    const impacto = (eventosImpacto || []).map((e: any) => ({
      key: `impacto:${e.id}`,
      id: e.id,
      tipo: "impacto" as const,
      label: `🎯 ${e.nome}`,
      titulo: e.nome,
      data: e.data_inicio as string | null,
      dataLabel: fmtData(e.data_inicio),
    }));
    const all = [...agenda, ...impacto];
    // Ordem cronológica ascendente; sem data vai pro fim
    all.sort((a, b) => {
      if (!a.data && !b.data) return 0;
      if (!a.data) return 1;
      if (!b.data) return -1;
      return a.data.localeCompare(b.data);
    });
    return all;
  }, [eventosAgenda, eventosImpacto]);

  const eventoAtual = useMemo(
    () => eventosOptions.find((e) => e.key === eventoSelecionado) || null,
    [eventosOptions, eventoSelecionado],
  );

  const { data: templateAtual, isFetching: loadingTemplate } = useQuery({
    queryKey: ["mensagem-evento-template", eventoAtual?.id, eventoAtual?.tipo, tipoMensagemSelecionada],
    enabled: !!eventoAtual && tipoMensagemSelecionada !== "contato_emergencia",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_evento_templates")
        .select("id, mensagem")
        .eq("evento_id", eventoAtual!.id)
        .eq("evento_tipo", eventoAtual!.tipo)
        .eq("tipo_mensagem", tipoMensagemSelecionada)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Configuração de emergência (mensagem + recorrência) — para tipo contato_emergencia
  const { data: emergCfg, isFetching: loadingEmerg } = useQuery({
    queryKey: ["emerg-cfg-homepage", eventoAtual?.id, eventoAtual?.tipo],
    enabled: !!eventoAtual && tipoMensagemSelecionada === "contato_emergencia",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_emergencia_config")
        .select("*")
        .eq("evento_id", eventoAtual!.id)
        .eq("evento_tipo", eventoAtual!.tipo)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (!eventoAtual) {
      setMensagemEvento("");
      return;
    }
    if (tipoMensagemSelecionada === "contato_emergencia") {
      setMensagemEvento(
        emergCfg?.mensagem_recorrente?.trim()
          ? emergCfg.mensagem_recorrente
          : TEMPLATES_PADRAO.contato_emergencia,
      );
      setRecCfg({
        recorrencia_tipo: (emergCfg?.recorrencia_tipo as any) || "semana",
        recorrencia_dias_semana: emergCfg?.recorrencia_dias_semana || [],
        recorrencia_meses: emergCfg?.recorrencia_meses || [],
        recorrencia_semana_ordinal: (emergCfg?.recorrencia_semana_ordinal as any) || "",
        recorrencia_dia_semana:
          emergCfg?.recorrencia_dia_semana ?? null,
        recorrencia_hora: (emergCfg?.recorrencia_hora || "08:00").slice(0, 5),
        enviar_recorrente: emergCfg?.enviar_recorrente ?? true,
      });
    } else {
      setMensagemEvento(templateAtual?.mensagem ?? TEMPLATES_PADRAO[tipoMensagemSelecionada]);
    }
  }, [eventoAtual, tipoMensagemSelecionada, templateAtual, emergCfg]);

  const salvarMensagemEvento = useMutation({
    mutationFn: async () => {
      if (!eventoAtual) throw new Error("Selecione um evento");
      if (tipoMensagemSelecionada === "contato_emergencia") {
        const payload = {
          evento_id: eventoAtual.id,
          evento_tipo: eventoAtual.tipo,
          mensagem_inicial: emergCfg?.mensagem_inicial || "",
          mensagem_recorrente: mensagemEvento,
          enviar_recorrente: recCfg.enviar_recorrente,
          frequencia_dias: emergCfg?.frequencia_dias ?? 7,
          recorrencia_tipo: recCfg.recorrencia_tipo,
          recorrencia_dias_semana: recCfg.recorrencia_dias_semana,
          recorrencia_meses: recCfg.recorrencia_meses,
          recorrencia_semana_ordinal: recCfg.recorrencia_semana_ordinal || null,
          recorrencia_dia_semana: recCfg.recorrencia_dia_semana,
          recorrencia_hora: recCfg.recorrencia_hora,
        };
        const { error } = await supabase
          .from("evento_emergencia_config")
          .upsert(payload, { onConflict: "evento_id,evento_tipo" });
        if (error) throw error;
        return;
      }
      const payload = {
        evento_id: eventoAtual.id,
        evento_tipo: eventoAtual.tipo,
        tipo_mensagem: tipoMensagemSelecionada,
        mensagem: mensagemEvento,
      };
      const { error } = await supabase
        .from("mensagens_evento_templates")
        .upsert(payload, { onConflict: "evento_id,evento_tipo,tipo_mensagem" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagem-evento-template"] });
      queryClient.invalidateQueries({ queryKey: ["emerg-cfg-homepage"] });
      toast.success("Mensagem do evento salva com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar mensagem: " + error.message);
    },
  });

  const restaurarPadrao = useMutation({
    mutationFn: async () => {
      if (!eventoAtual) throw new Error("Selecione um evento");
      const { error } = await supabase
        .from("mensagens_evento_templates")
        .delete()
        .eq("evento_id", eventoAtual.id)
        .eq("evento_tipo", eventoAtual.tipo)
        .eq("tipo_mensagem", tipoMensagemSelecionada);
      if (error) throw error;
    },
    onSuccess: () => {
      setMensagemEvento(TEMPLATES_PADRAO[tipoMensagemSelecionada]);
      queryClient.invalidateQueries({ queryKey: ["mensagem-evento-template"] });
      toast.success("Mensagem restaurada para o padrão");
    },
    onError: (error: any) => {
      toast.error("Erro ao restaurar: " + error.message);
    },
  });

  if (loadingIgreja || loadingEventos || loadingHomepage) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-heading font-bold">Configurações Gerais</h2>
          <p className="text-sm text-muted-foreground">
            Dados da igreja e horários de culto exibidos no rodapé
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/cadastros?tab=igreja")}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Editar Dados da Igreja
        </Button>
      </div>

      {/* Dados da Igreja */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dados da Igreja (Rodapé)
          </CardTitle>
          <CardDescription>
            Essas informações são exibidas na seção de contato do rodapé
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {igrejaConfig ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Nome:</span>
                  <span>{igrejaConfig.nome_fantasia}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Telefone:</span>
                  <span>{igrejaConfig.telefone || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Celular:</span>
                  <span>{igrejaConfig.celular || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{igrejaConfig.email || "Não informado"}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium">Endereço:</span>
                    <p className="text-muted-foreground">
                      {igrejaConfig.address}, {igrejaConfig.number}
                      {igrejaConfig.complement && ` - ${igrejaConfig.complement}`}
                      <br />
                      {igrejaConfig.neighborhood} - {igrejaConfig.city}/{igrejaConfig.state}
                      <br />
                      CEP: {igrejaConfig.cep}
                    </p>
                  </div>
                </div>
                {igrejaConfig.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Website:</span>
                    <a 
                      href={`https://${igrejaConfig.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-secondary hover:underline"
                    >
                      {igrejaConfig.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Dados da igreja não configurados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horários de Culto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horários de Culto (Rodapé)
          </CardTitle>
          <CardDescription>
            Os horários vêm dos eventos recorrentes do tipo "Culto" cadastrados na Agenda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventosRecorrentes && eventosRecorrentes.length > 0 ? (
            <div className="space-y-2">
              {eventosRecorrentes.map((evento) => (
                <div 
                  key={evento.id} 
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <Badge variant="outline">
                    {diasSemana[evento.dia_semana ?? 0]}
                  </Badge>
                  <span className="font-medium">{evento.hora_inicio || "—"}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{evento.titulo}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Nenhum culto recorrente cadastrado
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => navigate("/agenda")}
              >
                Cadastrar na Agenda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensagem de Aniversário */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="w-5 h-5" />
            Mensagem de Aniversário (WhatsApp)
          </CardTitle>
          <CardDescription>
            Configure a mensagem que será enviada automaticamente às 08:00 para os aniversariantes do dia.
            <br />
            <span className="font-medium">Variáveis disponíveis:</span> {"{NOME}"} = primeiro nome, {"{VERSICULO}"} = versículo aleatório, {"{REFERENCIA}"} = referência bíblica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mensagem-aniversario">Mensagem</Label>
            <Textarea
              id="mensagem-aniversario"
              value={mensagemAniversario}
              onChange={(e) => setMensagemAniversario(e.target.value)}
              placeholder="Digite a mensagem de aniversário..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Use *texto* para <strong>negrito</strong> e _texto_ para <em>itálico</em> no WhatsApp
            </p>
            <Button 
              onClick={() => salvarMensagem.mutate()}
              disabled={salvarMensagem.isPending}
            >
              {salvarMensagem.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Mensagem
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mensagens de Eventos (WhatsApp) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Mensagens de Eventos (WhatsApp)
          </CardTitle>
          <CardDescription>
            Edite as mensagens enviadas automaticamente aos participantes para cada evento.
            <br />
            Se nenhuma mensagem personalizada for definida, será usada a mensagem padrão do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Evento</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar evento..."
                  className="pl-9"
                  value={buscaEvento}
                  onChange={(e) => setBuscaEvento(e.target.value)}
                />
              </div>
              <Select value={eventoSelecionado} onValueChange={setEventoSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {(() => {
                    const q = buscaEvento.trim().toLowerCase();
                    const list = q
                      ? eventosOptions.filter((e) =>
                          (e.titulo || "").toLowerCase().includes(q),
                        )
                      : eventosOptions;
                    if (list.length === 0) {
                      return (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum evento encontrado
                        </div>
                      );
                    }
                    return list.map((e) => (
                      <SelectItem key={e.key} value={e.key}>
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span className="truncate">{e.label}</span>
                          {e.dataLabel && (
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {e.dataLabel}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de mensagem</Label>
              <Select
                value={tipoMensagemSelecionada}
                onValueChange={(v) => setTipoMensagemSelecionada(v as TipoMensagem)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_MENSAGEM.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TIPOS_MENSAGEM.find((t) => t.value === tipoMensagemSelecionada)?.descricao}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mensagem-evento">Mensagem</Label>
              {templateAtual && (
                <Badge variant="secondary" className="text-xs">
                  Personalizada
                </Badge>
              )}
            </div>
            <Textarea
              id="mensagem-evento"
              value={mensagemEvento}
              onChange={(e) => setMensagemEvento(e.target.value)}
              placeholder={
                eventoAtual
                  ? "Digite a mensagem personalizada..."
                  : "Selecione um evento para editar a mensagem"
              }
              disabled={!eventoAtual || loadingTemplate}
              rows={14}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Use *texto* para <strong>negrito</strong> e _texto_ para <em>itálico</em> no WhatsApp
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => restaurarPadrao.mutate()}
                disabled={!eventoAtual || !templateAtual || restaurarPadrao.isPending}
              >
                {restaurarPadrao.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Restaurar padrão
              </Button>
              <Button
                size="sm"
                onClick={() => salvarMensagemEvento.mutate()}
                disabled={!eventoAtual || !mensagemEvento.trim() || salvarMensagemEvento.isPending}
              >
                {salvarMensagemEvento.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Mensagem
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomepageConfigTab;
