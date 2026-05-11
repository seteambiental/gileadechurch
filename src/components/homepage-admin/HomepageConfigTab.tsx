import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { Settings, Building2, ExternalLink, Phone, Mail, MapPin, Globe, Clock, Cake, Save, Loader2, MessageSquare, RotateCcw, Search, Pencil, Trash2, ShieldAlert, ListChecks, Calendar, Target, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import EnvioEmergenciaDialog from "@/components/impacto/EnvioEmergenciaDialog";

type TipoMensagem =
  | "confirmacao_inscricao"
  | "inscricao_recebida"
  | "lembrete_pagamento"
  | "vaga_liberada"
  | "contato_emergencia"
  | "aviso_importante"
  | "lembrete_evento"
  | "culto_batismo"
  | "apresentacao_criancas"
  | "ceia_senhor"
  | "prestacao_contas"
  | "evento_especial";

const TIPOS_MENSAGEM: { value: TipoMensagem; label: string; descricao: string }[] = [
  { value: "confirmacao_inscricao", label: "Confirmação de inscrição", descricao: "Enviada quando o ADM confirma a inscrição" },
  { value: "inscricao_recebida", label: "Inscrição recebida", descricao: "Enviada automaticamente ao se inscrever" },
  { value: "lembrete_pagamento", label: "Lembrete de pagamento", descricao: "Enviada para quem está com pagamento pendente" },
  { value: "vaga_liberada", label: "Vaga liberada (lista de espera)", descricao: "Enviada quando uma vaga é liberada" },
  { value: "contato_emergencia", label: "Contato de Emergência", descricao: "Mensagem recorrente enviada ao contato de emergência do participante" },
  { value: "aviso_importante", label: "Aviso importante", descricao: "Comunicado relevante enviado a participantes/membros" },
  { value: "lembrete_evento", label: "Lembrete do evento", descricao: "Lembra do evento ou programação na data próxima" },
  { value: "culto_batismo", label: "Culto de Batismo", descricao: "Comunica que haverá culto de batismo" },
  { value: "apresentacao_criancas", label: "Apresentação de Crianças", descricao: "Comunica apresentação de crianças no culto" },
  { value: "ceia_senhor", label: "Ceia do Senhor", descricao: "Lembrete sobre a Ceia do Senhor" },
  { value: "prestacao_contas", label: "Prestação de Contas", descricao: "Comunica prestação de contas no culto" },
  { value: "evento_especial", label: "Evento Especial", descricao: "Anuncia evento especial durante o culto" },
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
  aviso_importante: `📢 *AVISO IMPORTANTE*

Olá, {NOME}! 👋

Sobre *{EVENTO}*: leia este aviso com atenção.

_Igreja Gileade_ 💙`,
  lembrete_evento: `📅 *LEMBRETE — {EVENTO}*

Olá, {NOME}! 👋

Não esqueça: *{EVENTO}* acontece em {DATA_EVENTO}.
📍 *Local:* {LOCAL}

Te esperamos! 🙏

_Igreja Gileade_ 💙`,
  culto_batismo: `💧 *CULTO DE BATISMO*

Olá, {NOME}! 👋

Neste *{EVENTO}* teremos um momento muito especial: o *Culto de Batismo*.
Venha celebrar conosco essa decisão de fé! 🙏

_Igreja Gileade_ 💙`,
  apresentacao_criancas: `👶 *APRESENTAÇÃO DE CRIANÇAS*

Olá, {NOME}! 👋

Neste *{EVENTO}* teremos a *Apresentação de Crianças* à comunidade.
Participe desse momento de bênção e gratidão! 🙏

_Igreja Gileade_ 💙`,
  ceia_senhor: `🍞🍷 *CEIA DO SENHOR*

Olá, {NOME}! 👋

Neste *{EVENTO}* celebraremos juntos a *Ceia do Senhor*.
Prepare seu coração para esse momento sagrado. 🙏

_Igreja Gileade_ 💙`,
  prestacao_contas: `📊 *PRESTAÇÃO DE CONTAS*

Olá, {NOME}! 👋

Neste *{EVENTO}* faremos a *Prestação de Contas* da nossa igreja.
Sua presença é importante! 🙏

_Igreja Gileade_ 💙`,
  evento_especial: `✨ *EVENTO ESPECIAL*

Olá, {NOME}! 👋

Neste *{EVENTO}* teremos uma programação especial preparada com muito carinho.
Venha viver esse momento conosco! 🙏

_Igreja Gileade_ 💙`,
};

const HomepageConfigTab = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mensagemAniversario, setMensagemAniversario] = useState("");
  const [tiposCategoriaExpandido, setTiposCategoriaExpandido] = useState(false);
  const [mensagemCarregada, setMensagemCarregada] = useState(false);

  // Estado da seção "Mensagens de Eventos"
  const [eventoSelecionado, setEventoSelecionado] = useState<string>("");
  const [buscaEvento, setBuscaEvento] = useState<string>("");
  const [tipoMensagemSelecionada, setTipoMensagemSelecionada] = useState<TipoMensagem>("confirmacao_inscricao");
  const [mensagemEvento, setMensagemEvento] = useState<string>("");

  // Estado para configuração de recorrência (somente quando tipo = contato_emergencia)
  type RecCfg = {
    modo_envio: "recorrente" | "unico";
    data_envio_unico: string | null; // ISO datetime-local "YYYY-MM-DDTHH:mm"
    recorrencia_tipo: "dia" | "semana" | "mes";
    recorrencia_dias_semana: number[];
    recorrencia_meses: number[];
    recorrencia_semana_ordinal: "primeiro" | "segundo" | "terceiro" | "quarto" | "ultimo" | "";
    recorrencia_dia_semana: number | null;
    recorrencia_hora: string;
    enviar_recorrente: boolean;
  };
  const REC_DEFAULT: RecCfg = {
    modo_envio: "recorrente",
    data_envio_unico: null,
    recorrencia_tipo: "semana",
    recorrencia_dias_semana: [],
    recorrencia_meses: [],
    recorrencia_semana_ordinal: "",
    recorrencia_dia_semana: null,
    recorrencia_hora: "08:00",
    enviar_recorrente: true,
  };
  const [recCfg, setRecCfg] = useState<RecCfg>(REC_DEFAULT);

  // Indica se a mensagem do evento/tipo selecionado deve ser tratada como recorrente
  const [usaRecorrencia, setUsaRecorrencia] = useState<boolean>(false);

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

  // Configuração de quais tipos de mensagem estão habilitados por categoria de evento
  const { data: categoriaTipos } = useQuery({
    queryKey: ["categoria-mensagem-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categoria_mensagem_config" as any)
        .select("categoria_evento, tipo_mensagem, ativo");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const toggleCategoriaTipo = useMutation({
    mutationFn: async (vars: { categoria: CategoriaEvento; tipo: TipoMensagem; ativo: boolean }) => {
      const { error } = await supabase
        .from("categoria_mensagem_config" as any)
        .upsert(
          { categoria_evento: vars.categoria, tipo_mensagem: vars.tipo, ativo: vars.ativo },
          { onConflict: "categoria_evento,tipo_mensagem" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoria-mensagem-config"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar configuração"),
  });

  type CategoriaEvento = "agenda_sem_inscricao" | "agenda_com_inscricao" | "impacto" | "culto";

  const isTipoAtivoParaCategoria = (categoria: CategoriaEvento, tipo: TipoMensagem) => {
    const row = (categoriaTipos || []).find(
      (r: any) => r.categoria_evento === categoria && r.tipo_mensagem === tipo,
    );
    return row ? !!row.ativo : false;
  };

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
      categoria: (e.necessita_inscricao ? "agenda_com_inscricao" : "agenda_sem_inscricao") as CategoriaEvento,
      label: `📅 ${e.titulo}`,
      titulo: e.titulo,
      data: e.data_evento as string | null,
      dataLabel: fmtData(e.data_evento),
    }));
    const impacto = (eventosImpacto || []).map((e: any) => ({
      key: `impacto:${e.id}`,
      id: e.id,
      tipo: "impacto" as const,
      categoria: "impacto" as CategoriaEvento,
      label: `🎯 ${e.nome}`,
      titulo: e.nome,
      data: e.data_inicio as string | null,
      dataLabel: fmtData(e.data_inicio),
    }));
    const cultos = [
      {
        key: "culto:11111111-1111-1111-1111-111111111111",
        id: "11111111-1111-1111-1111-111111111111",
        tipo: "culto" as const,
        categoria: "culto" as CategoriaEvento,
        label: "⛪ Cultos de Celebração (Domingos)",
        titulo: "Cultos de Celebração",
        data: null as string | null,
        dataLabel: "Recorrente — Domingos",
      },
      {
        key: "culto:22222222-2222-2222-2222-222222222222",
        id: "22222222-2222-2222-2222-222222222222",
        tipo: "culto" as const,
        categoria: "culto" as CategoriaEvento,
        label: "⛪ Quarta com Propósito",
        titulo: "Quarta com Propósito",
        data: null as string | null,
        dataLabel: "Recorrente — Quartas",
      },
    ];
    const all = [...cultos, ...agenda, ...impacto];
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

  // Tipos disponíveis para o evento selecionado (com base em categoria_mensagem_config)
  const tiposDisponiveis = useMemo(() => {
    if (!eventoAtual) return TIPOS_MENSAGEM;
    return TIPOS_MENSAGEM.filter((t) =>
      isTipoAtivoParaCategoria(eventoAtual.categoria, t.value),
    );
  }, [eventoAtual, categoriaTipos]);

  // Se o tipo selecionado deixar de estar disponível, ajusta para o primeiro disponível
  useEffect(() => {
    if (!eventoAtual) return;
    if (tiposDisponiveis.length === 0) return;
    if (!tiposDisponiveis.some((t) => t.value === tipoMensagemSelecionada)) {
      setTipoMensagemSelecionada(tiposDisponiveis[0].value);
    }
  }, [eventoAtual, tiposDisponiveis, tipoMensagemSelecionada]);

  // Default da recorrência ao trocar tipo: liga para Contato de Emergência, desliga para os demais
  useEffect(() => {
    setUsaRecorrencia(tipoMensagemSelecionada === "contato_emergencia");
  }, [tipoMensagemSelecionada, eventoSelecionado]);

  const { data: templateAtual, isFetching: loadingTemplate } = useQuery({
    queryKey: ["mensagem-evento-template", eventoAtual?.id, eventoAtual?.tipo, tipoMensagemSelecionada],
    enabled: !!eventoAtual && !usaRecorrencia,
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

  // Configuração de mensagem recorrente para o evento/tipo selecionado
  const { data: emergCfg, isFetching: loadingEmerg } = useQuery({
    queryKey: ["emerg-cfg-homepage", eventoAtual?.id, eventoAtual?.tipo, tipoMensagemSelecionada],
    enabled: !!eventoAtual && usaRecorrencia,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_emergencia_config")
        .select("*")
        .eq("evento_id", eventoAtual!.id)
        .eq("evento_tipo", eventoAtual!.tipo)
        .eq("tipo_mensagem", tipoMensagemSelecionada)
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
    if (usaRecorrencia) {
      setMensagemEvento(
        emergCfg?.mensagem_recorrente?.trim()
          ? emergCfg.mensagem_recorrente
          : TEMPLATES_PADRAO[tipoMensagemSelecionada] || TEMPLATES_PADRAO.contato_emergencia,
      );
      setRecCfg({
        modo_envio: ((emergCfg?.modo_envio as any) === "unico" ? "unico" : "recorrente"),
        data_envio_unico: emergCfg?.data_envio_unico
          ? String(emergCfg.data_envio_unico).slice(0, 16)
          : null,
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
  }, [eventoAtual, tipoMensagemSelecionada, templateAtual, emergCfg, usaRecorrencia]);

  const salvarMensagemEvento = useMutation({
    mutationFn: async () => {
      if (!eventoAtual) throw new Error("Selecione um evento");
      if (usaRecorrencia) {
        const payload = {
          evento_id: eventoAtual.id,
          evento_tipo: eventoAtual.tipo,
          tipo_mensagem: tipoMensagemSelecionada,
          mensagem_inicial: emergCfg?.mensagem_inicial || "",
          mensagem_recorrente: mensagemEvento,
          enviar_recorrente: recCfg.enviar_recorrente,
          frequencia_dias: emergCfg?.frequencia_dias ?? 7,
          modo_envio: recCfg.modo_envio,
          data_envio_unico:
            recCfg.modo_envio === "unico" && recCfg.data_envio_unico
              ? new Date(recCfg.data_envio_unico).toISOString()
              : null,
          recorrencia_tipo: recCfg.recorrencia_tipo,
          recorrencia_dias_semana: recCfg.recorrencia_dias_semana,
          recorrencia_meses: recCfg.recorrencia_meses,
          recorrencia_semana_ordinal: recCfg.recorrencia_semana_ordinal || null,
          recorrencia_dia_semana: recCfg.recorrencia_dia_semana,
          recorrencia_hora: recCfg.recorrencia_hora,
        };
        const { error } = await supabase
          .from("evento_emergencia_config")
          .upsert(payload, { onConflict: "evento_id,evento_tipo,tipo_mensagem" });
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
      queryClient.invalidateQueries({ queryKey: ["emerg-cfg-list"] });
      toast.success("Mensagem do evento salva com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar mensagem: " + error.message);
    },
  });

  // Lista de mensagens recorrentes ao contato de emergência configuradas
  const { data: emergList = [] } = useQuery({
    queryKey: ["emerg-cfg-list"],
    queryFn: async () => {
      const { data: cfgs, error } = await supabase
        .from("evento_emergencia_config")
        .select("*")
        .eq("ativo", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const list = cfgs || [];
      const ids = Array.from(new Set(list.map((c: any) => c.evento_id)));
      if (ids.length === 0) return [] as any[];
      const [{ data: ag }, { data: im }] = await Promise.all([
        supabase.from("agenda_igreja").select("id, titulo, data_evento").in("id", ids),
        supabase.from("impacto_eventos").select("id, nome, data_inicio").in("id", ids),
      ]);
      const map = new Map<string, { titulo: string; data: string | null }>();
      (ag || []).forEach((e: any) =>
        map.set(`agenda:${e.id}`, { titulo: e.titulo, data: e.data_evento }),
      );
      (im || []).forEach((e: any) =>
        map.set(`impacto:${e.id}`, { titulo: e.nome, data: e.data_inicio }),
      );
      map.set("culto:11111111-1111-1111-1111-111111111111", {
        titulo: "Cultos de Celebração (Domingos)",
        data: null,
      });
      map.set("culto:22222222-2222-2222-2222-222222222222", {
        titulo: "Quarta com Propósito",
        data: null,
      });
      return list.map((c: any) => {
        const meta = map.get(`${c.evento_tipo}:${c.evento_id}`);
        return { ...c, evento_titulo: meta?.titulo || "(evento removido)", evento_data: meta?.data || null };
      });
    },
  });

  const excluirEmergCfg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evento_emergencia_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração removida");
      queryClient.invalidateQueries({ queryKey: ["emerg-cfg-list"] });
      queryClient.invalidateQueries({ queryKey: ["emerg-cfg-homepage"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const formatRecorrencia = (c: any) => {
    if (!c.enviar_recorrente) return "Envio desativado";
    if (c.modo_envio === "unico") {
      if (!c.data_envio_unico) return "Único — data não definida";
      const d = new Date(c.data_envio_unico);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(2);
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `Único — ${dd}/${mm}/${yy} às ${hh}:${mi}`;
    }
    const hora = (c.recorrencia_hora || "08:00").slice(0, 5);
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    if (c.recorrencia_tipo === "dia") {
      const d = (c.recorrencia_dias_semana || []).map((i: number) => dias[i]).join(", ");
      return `Diário${d ? ` (${d})` : ""} • ${hora}`;
    }
    if (c.recorrencia_tipo === "semana") {
      const d = (c.recorrencia_dias_semana || []).map((i: number) => dias[i]).join(", ");
      return `Semanal${d ? ` — ${d}` : ""} • ${hora}`;
    }
    if (c.recorrencia_tipo === "mes") {
      const m = (c.recorrencia_meses || []).map((i: number) => meses[i - 1]).join(", ");
      const ord = c.recorrencia_semana_ordinal
        ? `${c.recorrencia_semana_ordinal} ${dias[c.recorrencia_dia_semana ?? 0] || ""}`
        : "";
      return `Mensal${m ? ` — ${m}` : ""}${ord ? ` (${ord})` : ""} • ${hora}`;
    }
    return `A cada ${c.frequencia_dias || 7} dias • ${hora}`;
  };

  const handleEditEmergCfg = (c: any) => {
    setTipoMensagemSelecionada((c.tipo_mensagem as TipoMensagem) || "contato_emergencia");
    setEventoSelecionado(`${c.evento_tipo}:${c.evento_id}`);
    setUsaRecorrencia(true);
    if (typeof window !== "undefined") {
      setTimeout(
        () =>
          document
            .getElementById("mensagens-eventos-card")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50,
      );
    }
  };

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
      <Card id="mensagens-eventos-card">
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
                  {(tiposDisponiveis.length > 0 ? tiposDisponiveis : TIPOS_MENSAGEM).map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TIPOS_MENSAGEM.find((t) => t.value === tipoMensagemSelecionada)?.descricao}
                {eventoAtual && tiposDisponiveis.length === 0 && (
                  <span className="block text-amber-600 mt-1">
                    Nenhum tipo de mensagem habilitado para esta categoria. Configure abaixo.
                  </span>
                )}
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
              disabled={!eventoAtual || loadingTemplate || loadingEmerg}
              rows={14}
              className="font-mono text-sm"
            />
            {usaRecorrencia && (
              <p className="text-xs text-muted-foreground">
                Placeholders disponíveis: <code>{"{NOME}"}</code>, <code>{"{NOME_COMPLETO}"}</code>,{" "}
                <code>{"{NOME_EMERGENCIA}"}</code>, <code>{"{EVENTO}"}</code>, <code>{"{DATA_EVENTO}"}</code>.
              </p>
            )}
          </div>

          {eventoAtual && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-semibold">Configurar como envio recorrente</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, esta mensagem é enviada automaticamente em uma frequência definida até o evento.
                </p>
              </div>
              <Switch
                checked={usaRecorrencia}
                onCheckedChange={(v) => setUsaRecorrencia(!!v)}
              />
            </div>
          )}

          {usaRecorrencia && eventoAtual && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Configuração de envio</Label>
                  <p className="text-xs text-muted-foreground">
                    Defina se a mensagem será enviada de forma recorrente ou em uma data única.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={recCfg.enviar_recorrente}
                    onChange={(e) =>
                      setRecCfg({ ...recCfg, enviar_recorrente: e.target.checked })
                    }
                  />
                  Ativar envio
                </label>
              </div>

              {recCfg.enviar_recorrente && (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(["recorrente", "unico"] as const).map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setRecCfg({ ...recCfg, modo_envio: m })}
                        className={`px-3 py-1.5 rounded-md text-sm border transition ${
                          recCfg.modo_envio === m
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {m === "recorrente" ? "Recorrente" : "Único"}
                      </button>
                    ))}
                  </div>

                  {recCfg.modo_envio === "unico" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Data e hora do envio</Label>
                        <Input
                          type="datetime-local"
                          value={recCfg.data_envio_unico || ""}
                          onChange={(e) =>
                            setRecCfg({ ...recCfg, data_envio_unico: e.target.value || null })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          A mensagem será disparada após esse horário.
                        </p>
                      </div>
                    </div>
                  )}

                  {recCfg.modo_envio === "recorrente" && (
                  <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Enviar a cada</Label>
                      <Select
                        value={recCfg.recorrencia_tipo}
                        onValueChange={(v) =>
                          setRecCfg({ ...recCfg, recorrencia_tipo: v as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dia">Dia</SelectItem>
                          <SelectItem value="semana">Semana</SelectItem>
                          <SelectItem value="mes">Mês</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hora aproximada de envio</Label>
                      <Input
                        type="time"
                        value={recCfg.recorrencia_hora}
                        onChange={(e) =>
                          setRecCfg({ ...recCfg, recorrencia_hora: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        O envio ocorre após esse horário (margem de alguns minutos).
                      </p>
                    </div>
                  </div>

                  {(recCfg.recorrencia_tipo === "dia" ||
                    recCfg.recorrencia_tipo === "semana") && (
                    <div className="space-y-2">
                      <Label>
                        {recCfg.recorrencia_tipo === "dia"
                          ? "Dias da semana em que pode disparar"
                          : "Dia(s) da semana"}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                          (lbl, idx) => {
                            const ativo = recCfg.recorrencia_dias_semana.includes(idx);
                            return (
                              <button
                                type="button"
                                key={lbl}
                                onClick={() => {
                                  const set = new Set(recCfg.recorrencia_dias_semana);
                                  ativo ? set.delete(idx) : set.add(idx);
                                  setRecCfg({
                                    ...recCfg,
                                    recorrencia_dias_semana: Array.from(set).sort(),
                                  });
                                }}
                                className={`px-3 py-1 rounded-md text-sm border transition ${
                                  ativo
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted"
                                }`}
                              >
                                {lbl}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  {recCfg.recorrencia_tipo === "mes" && (
                    <>
                      <div className="space-y-2">
                        <Label>Meses em que deve enviar</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Jan","Fev","Mar","Abr","Mai","Jun",
                            "Jul","Ago","Set","Out","Nov","Dez",
                          ].map((lbl, idx) => {
                            const m = idx + 1;
                            const ativo = recCfg.recorrencia_meses.includes(m);
                            return (
                              <button
                                type="button"
                                key={lbl}
                                onClick={() => {
                                  const set = new Set(recCfg.recorrencia_meses);
                                  ativo ? set.delete(m) : set.add(m);
                                  setRecCfg({
                                    ...recCfg,
                                    recorrencia_meses: Array.from(set).sort(
                                      (a, b) => a - b,
                                    ),
                                  });
                                }}
                                className={`px-3 py-1 rounded-md text-sm border transition ${
                                  ativo
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted"
                                }`}
                              >
                                {lbl}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Ordinal no mês</Label>
                          <Select
                            value={recCfg.recorrencia_semana_ordinal || ""}
                            onValueChange={(v) =>
                              setRecCfg({
                                ...recCfg,
                                recorrencia_semana_ordinal: v as any,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Ex: Primeiro" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primeiro">Primeiro</SelectItem>
                              <SelectItem value="segundo">Segundo</SelectItem>
                              <SelectItem value="terceiro">Terceiro</SelectItem>
                              <SelectItem value="quarto">Quarto</SelectItem>
                              <SelectItem value="ultimo">Último</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Dia da semana</Label>
                          <Select
                            value={
                              recCfg.recorrencia_dia_semana !== null
                                ? String(recCfg.recorrencia_dia_semana)
                                : ""
                            }
                            onValueChange={(v) =>
                              setRecCfg({
                                ...recCfg,
                                recorrencia_dia_semana: v === "" ? null : Number(v),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Ex: Segunda" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Domingo</SelectItem>
                              <SelectItem value="1">Segunda-feira</SelectItem>
                              <SelectItem value="2">Terça-feira</SelectItem>
                              <SelectItem value="3">Quarta-feira</SelectItem>
                              <SelectItem value="4">Quinta-feira</SelectItem>
                              <SelectItem value="5">Sexta-feira</SelectItem>
                              <SelectItem value="6">Sábado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                  </>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Use *texto* para <strong>negrito</strong> e _texto_ para <em>itálico</em> no WhatsApp
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => restaurarPadrao.mutate()}
                disabled={
                  !eventoAtual ||
                  usaRecorrencia ||
                  !templateAtual ||
                  restaurarPadrao.isPending
                }
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

      {/* Tipos de mensagem habilitados por categoria de evento */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setTiposCategoriaExpandido((v) => !v)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Tipos de mensagem por categoria de evento
              </CardTitle>
              <CardDescription>
                Habilite quais tipos de mensagem podem ser configurados para cada categoria de evento.
                Os tipos desabilitados não aparecerão no seletor acima.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTiposCategoriaExpandido((v) => !v);
              }}
              aria-label={tiposCategoriaExpandido ? "Recolher" : "Expandir"}
            >
              {tiposCategoriaExpandido ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {tiposCategoriaExpandido && (
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {([
              { key: "agenda_sem_inscricao", label: "Agenda — sem inscrição", icon: Calendar },
              { key: "agenda_com_inscricao", label: "Agenda — com inscrição", icon: Calendar },
              { key: "impacto", label: "Eventos Impacto", icon: Target },
              { key: "culto", label: "Cultos (Domingo / Quarta)", icon: Calendar },
            ] as const).map(({ key: cat, label, icon: Icon }) => (
              <div key={cat} className="border rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold">{label}</h4>
                </div>
                <div className="space-y-2">
                  {TIPOS_MENSAGEM.map((t) => {
                    const ativo = isTipoAtivoParaCategoria(cat, t.value);
                    return (
                      <div
                        key={`${cat}-${t.value}`}
                        className="flex items-start justify-between gap-3 py-1"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.descricao}</p>
                        </div>
                        <Switch
                          checked={ativo}
                          disabled={toggleCategoriaTipo.isPending}
                          onCheckedChange={(checked) =>
                            toggleCategoriaTipo.mutate({
                              categoria: cat,
                              tipo: t.value,
                              ativo: checked,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        )}
      </Card>

      {/* Lista de mensagens recorrentes ao Contato de Emergência configuradas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Mensagens recorrentes
          </CardTitle>
          <CardDescription>
            Eventos com mensagens configuradas para envio recorrente (lembretes, contato de emergência, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emergList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma mensagem configurada ainda.
            </p>
          ) : (
            <div className="divide-y border rounded-md">
              {emergList.map((c: any) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.evento_titulo}
                      <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                        {c.evento_tipo}
                      </Badge>
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {TIPOS_MENSAGEM.find((t) => t.value === c.tipo_mensagem)?.label
                          || c.tipo_mensagem
                          || "contato_emergencia"}
                      </Badge>
                      {!c.enviar_recorrente && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          inativa
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRecorrencia(c)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEmergCfg(c)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Remover configuração de "${c.evento_titulo}"?`)) {
                          excluirEmergCfg.mutate(c.id);
                        }
                      }}
                      disabled={excluirEmergCfg.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HomepageConfigTab;
