import { useState, useEffect } from "react";
import { todayDateStr } from "@/lib/date-utils";
import { resizeKeepAspect } from "@/lib/image-resize";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getCorPorTipo } from "@/lib/event-colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload, Sparkles, X, Download, Send, Check, RotateCcw, Plus, Utensils, DollarSign, CalendarIcon } from "lucide-react";
import { Copy, MessageSquare, Link as LinkIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import logoGileade from "@/assets/logo-gileade.jpeg";

interface HorarioDia {
  data: string;
  periodo: string;
  hora_inicio: string;
  hora_fim: string;
}

interface AmbienteExtra {
  ambiente_id: string;
  bloqueio_inicio_data: string;
  bloqueio_inicio_hora: string;
  bloqueio_fim_data: string;
  bloqueio_fim_hora: string;
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  data_fim?: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  tipo_evento: string;
  genero_alvo: string;
  cor: string | null;
  recorrente: boolean;
  tipo_recorrencia: string | null;
  dia_semana: number | null;
  semana_mes: number | null;
  flyer_url: string | null;
  observacoes: string | null;
  idade_minima?: number | null;
  idade_maxima?: number | null;
  tem_refeicao?: boolean;
  comentarios_refeicao?: string | null;
  tem_custo?: boolean;
  valor_custo?: number | null;
  comentarios_custo?: string | null;
  horarios_por_dia?: HorarioDia[];
  limite_vagas?: number | null;
  vagas_por_tipo?: Record<string, number> | null;
}

interface EventoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento?: Evento | null;
  selectedDate?: Date | null;
  mode?: "evento" | "compromisso";
  approvalMode?: boolean;
  solicitanteId?: string;
}

const CORES = [
  { value: "#1e3a5f", label: "Azul Marinho" },
  { value: "#7b1e3a", label: "Bordô" },
  { value: "#2d4a3e", label: "Verde Floresta" },
  { value: "#4a2d6b", label: "Roxo Real" },
  { value: "#3d3d3d", label: "Cinza Carvão" },
  { value: "#dc2626", label: "Vermelho" },
  { value: "#2563eb", label: "Azul" },
  { value: "#7c3aed", label: "Roxo" },
  { value: "#16a34a", label: "Verde" },
  { value: "#ea580c", label: "Laranja" },
  { value: "#0891b2", label: "Ciano" },
  { value: "#db2777", label: "Rosa" },
  { value: "#b45309", label: "Âmbar" },
  { value: "#0d9488", label: "Teal" },
  { value: "#6366f1", label: "Índigo" },
  { value: "#84cc16", label: "Lima" },
  { value: "#f97316", label: "Tangerina" },
  { value: "#8b5cf6", label: "Violeta" },
];

const TIPOS_EVENTO = [
  { value: "batismo", label: "Batismo" },
  { value: "casa_refugio", label: "Casa Refúgio" },
  { value: "conferencia", label: "Conferência" },
  { value: "gileade_fest", label: "Gileade Fest" },
  { value: "impacto", label: "Impacto" },
  { value: "evento", label: "Evento" },
  { value: "retiro", label: "Retiro" },
  { value: "retiro_kids", label: "Retiro Kids" },
  { value: "acao_evangelistica", label: "Ação Evangelística" },
  { value: "outros", label: "Outros" },
];

const TIPOS_COMPROMISSO = [
  { value: "apresentacao_criancas", label: "Apresentação de Crianças" },
  { value: "aulas", label: "Aulas" },
  { value: "casamento", label: "Casamento" },
  { value: "churrasco", label: "Churrasco" },
  { value: "conexao_lider", label: "Conexão Líder" },
  { value: "confraternizacao", label: "Confraternização" },
  { value: "culto", label: "Culto" },
  { value: "ceia", label: "Culto de Ceia" },
  { value: "cursos", label: "Cursos" },
  { value: "quarta_proposito", label: "Quarta com Propósito" },
  { value: "quarta_proposito_prestacao", label: "Quarta com Propósito - Prestação de Contas" },
  { value: "outros", label: "Outros" },
];

export const EventoFormDialog = ({
  open,
  onOpenChange,
  evento,
  selectedDate,
  mode = "evento",
  approvalMode = false,
  solicitanteId,
}: EventoFormDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [flyerPendente, setFlyerPendente] = useState<string | null>(null);
  const [grupoEnvio, setGrupoEnvio] = useState("");
  const [isSendingFlyer, setIsSendingFlyer] = useState(false);
  const [templateFlyer, setTemplateFlyer] = useState("moderno");
  const [textoCompartilhamento, setTextoCompartilhamento] = useState<string | null>(null);
  const [isGeneratingTexto, setIsGeneratingTexto] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    data_evento: "",
    data_fim: "",
    hora_inicio: "",
    hora_fim: "",
    local: "Igreja Gileade",
    local_tipo: "na_igreja" as "na_igreja" | "fora",
    ambiente_id: "",
    bloqueio_inicio_data: "",
    bloqueio_inicio_hora: "",
    bloqueio_fim_data: "",
    bloqueio_fim_hora: "",
    tipo_evento: "evento",
    genero_alvo: "todos",
    cor: "#dc2626",
    recorrente: false,
    tipo_recorrencia: "",
    dia_semana: "",
    semana_mes: "",
    observacoes: "",
    idade_minima: "",
    idade_maxima: "",
    tem_refeicao: false,
    comentarios_refeicao: "",
    tem_custo: false,
    valor_custo: "",
    comentarios_custo: "",
    limite_vagas: "",
    visibilidade: "publico",
    necessita_inscricao: false,
    valor_membro: "",
    valor_nao_membro: "",
    valor_familia: "",
    valor_equipe: "",
    vagas_membro: "",
    vagas_nao_membro: "",
    vagas_familia: "",
    vagas_equipe: "",
    link_grupo_whatsapp: "",
  });
  const CAMPOS_FORMULARIO_OPTIONS = [
    { key: "nome", label: "Nome completo" },
    { key: "telefone", label: "Telefone / WhatsApp" },
    { key: "genero", label: "Gênero" },
    { key: "telefone_emergencia", label: "Telefone de Emergência" },
    { key: "cpf", label: "CPF" },
    { key: "rg", label: "RG" },
    { key: "menor_idade", label: "Menor de idade" },
    { key: "alergia", label: "Alergia" },
    { key: "medicamento", label: "Medicamento" },
    { key: "preferencia_beliche", label: "Preferência de Beliche" },
    { key: "forma_pagamento", label: "Forma de Pagamento" },
    { key: "igreja", label: "Igreja" },
    { key: "ministerio", label: "Ministério" },
    { key: "observacoes", label: "Observações" },
  ];
  const ALL_CAMPOS_KEYS = CAMPOS_FORMULARIO_OPTIONS.map(c => c.key);
  const [camposFormulario, setCamposFormulario] = useState<string[]>([...ALL_CAMPOS_KEYS]);

  const [ambientesExtras, setAmbientesExtras] = useState<AmbienteExtra[]>([]);

  const [horariosPorDia, setHorariosPorDia] = useState<HorarioDia[]>([]);

  const { data: ambientes = [] } = useQuery({
    queryKey: ["ambientes-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambientes")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (open) {
      // Load extra ambientes for existing events
      if (evento?.id) {
        supabase.from("agenda_ambientes")
          .select("ambiente_id, bloqueio_inicio, bloqueio_fim")
          .eq("agenda_id", evento.id)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setAmbientesExtras(data.map((d: any) => {
                const bi = d.bloqueio_inicio ? new Date(d.bloqueio_inicio) : null;
                const bf = d.bloqueio_fim ? new Date(d.bloqueio_fim) : null;
                return {
                  ambiente_id: d.ambiente_id,
                  bloqueio_inicio_data: bi ? format(bi, "yyyy-MM-dd") : "",
                  bloqueio_inicio_hora: bi ? format(bi, "HH:mm") : "",
                  bloqueio_fim_data: bf ? format(bf, "yyyy-MM-dd") : "",
                  bloqueio_fim_hora: bf ? format(bf, "HH:mm") : "",
                };
              }));
            } else {
              setAmbientesExtras([]);
            }
          });
      } else {
        setAmbientesExtras([]);
      }
      if (evento) {
        const bloqueioInicio = (evento as any).bloqueio_inicio ? new Date((evento as any).bloqueio_inicio) : null;
        const bloqueioFim = (evento as any).bloqueio_fim ? new Date((evento as any).bloqueio_fim) : null;
        const valoresPorTipo = (evento as any).valores_por_tipo as Record<string, string> | null;
        const vagasPorTipo = (evento as any).vagas_por_tipo as Record<string, number> | null;
        setFormData({
          titulo: evento.titulo || "",
          descricao: evento.descricao || "",
          data_evento: evento.data_evento || "",
          data_fim: evento.data_fim || "",
          hora_inicio: evento.hora_inicio?.substring(0, 5) || "",
          hora_fim: evento.hora_fim?.substring(0, 5) || "",
          local: evento.local || "Igreja Gileade",
          local_tipo: ((evento as any).local_tipo as "na_igreja" | "fora") || "na_igreja",
          ambiente_id: (evento as any).ambiente_id || "",
          bloqueio_inicio_data: bloqueioInicio ? format(bloqueioInicio, "yyyy-MM-dd") : "",
          bloqueio_inicio_hora: bloqueioInicio ? format(bloqueioInicio, "HH:mm") : "",
          bloqueio_fim_data: bloqueioFim ? format(bloqueioFim, "yyyy-MM-dd") : "",
          bloqueio_fim_hora: bloqueioFim ? format(bloqueioFim, "HH:mm") : "",
          tipo_evento: evento.tipo_evento || "evento",
          genero_alvo: evento.genero_alvo || "todos",
          cor: evento.cor || getCorPorTipo(evento.tipo_evento || "evento"),
          recorrente: evento.recorrente || false,
          tipo_recorrencia: evento.tipo_recorrencia || "",
          dia_semana: evento.dia_semana?.toString() || "",
          semana_mes: evento.semana_mes?.toString() || "",
          observacoes: evento.observacoes || "",
          idade_minima: evento.idade_minima?.toString() || "",
          idade_maxima: evento.idade_maxima?.toString() || "",
          tem_refeicao: evento.tem_refeicao || false,
          comentarios_refeicao: evento.comentarios_refeicao || "",
          tem_custo: evento.tem_custo || false,
          valor_custo: evento.valor_custo?.toString() || "",
          comentarios_custo: evento.comentarios_custo || "",
          limite_vagas: evento.limite_vagas?.toString() || "",
          visibilidade: (evento as any).visibilidade || "publico",
          necessita_inscricao: (evento as any).necessita_inscricao || false,
          valor_membro: valoresPorTipo?.membro || "",
          valor_nao_membro: valoresPorTipo?.nao_membro || "",
          valor_familia: valoresPorTipo?.familia || "",
          valor_equipe: valoresPorTipo?.equipe || "",
          vagas_membro: vagasPorTipo?.membro?.toString() || "",
          vagas_nao_membro: vagasPorTipo?.nao_membro?.toString() || "",
          vagas_familia: vagasPorTipo?.familia?.toString() || "",
          vagas_equipe: vagasPorTipo?.equipe?.toString() || "",
          link_grupo_whatsapp: (evento as any).link_grupo_whatsapp || "",
        });
        const existingCampos = (evento as any).campos_formulario;
        setCamposFormulario(Array.isArray(existingCampos) ? existingCampos : [...ALL_CAMPOS_KEYS]);
        setHorariosPorDia(evento.horarios_por_dia || []);
        setFlyerUrl(evento.flyer_url || null);
        setFlyerPendente(null);
      } else {
        const isCompromisso = mode === "compromisso";
        setFormData({
          titulo: "",
          descricao: "",
          data_evento: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
          data_fim: "",
          hora_inicio: "",
          hora_fim: "",
          local: "Igreja Gileade",
          local_tipo: "na_igreja",
          ambiente_id: "",
          bloqueio_inicio_data: "",
          bloqueio_inicio_hora: "",
          bloqueio_fim_data: "",
          bloqueio_fim_hora: "",
          tipo_evento: isCompromisso ? "culto" : "evento",
          genero_alvo: "todos",
          cor: getCorPorTipo(isCompromisso ? "culto" : "evento"),
          recorrente: isCompromisso,
          tipo_recorrencia: isCompromisso ? "semanal" : "",
          dia_semana: "",
          semana_mes: "",
          observacoes: "",
          idade_minima: "",
          idade_maxima: "",
          tem_refeicao: false,
          comentarios_refeicao: "",
          tem_custo: false,
          valor_custo: "",
          comentarios_custo: "",
          limite_vagas: "",
          visibilidade: "publico",
          necessita_inscricao: false,
          valor_membro: "",
          valor_nao_membro: "",
          valor_familia: "",
          valor_equipe: "",
          vagas_membro: "",
          vagas_nao_membro: "",
          vagas_familia: "",
          vagas_equipe: "",
          link_grupo_whatsapp: "",
        });
        setCamposFormulario([...ALL_CAMPOS_KEYS]);
        setAmbientesExtras([]);
        setHorariosPorDia([]);
        setFlyerUrl(null);
        setFlyerPendente(null);
        setTextoCompartilhamento(null);
      }
    }
  }, [open, evento, selectedDate, mode]);

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFlyer(true);
    try {
      // Redimensionar mantendo proporção, max 1200px largura
      const { file: resizedFile } = await resizeKeepAspect(file, 1200);
      const fileName = `flyer-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('encontros-fotos')
        .upload(`flyers/${fileName}`, resizedFile, {
          contentType: "image/jpeg",
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('encontros-fotos')
        .getPublicUrl(`flyers/${fileName}`);

      setFlyerUrl(urlData.publicUrl);
      toast({ title: "Flyer processado e carregado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: error.message });
    } finally {
      setIsUploadingFlyer(false);
    }
  };

  const getPublicoAlvoLabel = (value: string) => {
    const labels: Record<string, string> = {
      todos: "Todos",
      homens: "Homens",
      mulheres: "Mulheres",
      jovens: "Jovens",
      adolescentes: "Adolescentes",
      criancas: "Crianças",
      masculino: "Masculino",
      feminino: "Feminino",
    };
    return labels[value] || value;
  };

  const handleGenerateFlyer = async () => {
    if (!formData.titulo) {
      toast({ variant: "destructive", title: "Preencha o título primeiro" });
      return;
    }

    if (!formData.data_evento) {
      toast({ variant: "destructive", title: "Preencha a data do evento primeiro" });
      return;
    }

    setIsGeneratingFlyer(true);
    try {
      // Gerar link de inscrição
      const linkInscricao = evento?.id 
        ? `${window.location.origin}/inscricao/${evento.id}`
        : undefined;

      const { data, error } = await supabase.functions.invoke('gerar-flyer', {
        body: {
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipoEvento: formData.tipo_evento,
          dataEvento: formData.data_evento,
          dataFim: formData.data_fim,
          horaInicio: formData.hora_inicio,
          horaFim: formData.hora_fim,
          local: formData.local,
          publicoAlvo: formData.genero_alvo,
          idadeMinima: formData.idade_minima,
          idadeMaxima: formData.idade_maxima,
          temRefeicao: formData.tem_refeicao,
          comentariosRefeicao: formData.comentarios_refeicao,
          temCusto: formData.tem_custo,
          valorCusto: formData.valor_custo,
          comentariosCusto: formData.comentarios_custo,
          horariosPorDia: horariosPorDia,
          limiteVagas: formData.limite_vagas,
          observacoes: formData.observacoes,
          corFundo: formData.cor,
          template: templateFlyer,
          linkInscricao,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Se for template simples, mostra o texto para copiar
      if (templateFlyer === "simples" && data.textoCompartilhamento) {
        setFlyerPendente(data.flyerUrl);
        setTextoCompartilhamento(data.textoCompartilhamento);
        toast({ title: "Flyer informativo gerado!" });
      } else if (data.flyerUrl) {
        setFlyerPendente(data.flyerUrl);
        setTextoCompartilhamento(null);
        toast({ title: "Flyer gerado! Aceite ou descarte." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao gerar flyer", description: error.message });
    } finally {
      setIsGeneratingFlyer(false);
    }
  };

  const handleCopyTexto = async () => {
    if (!textoCompartilhamento) return;
    try {
      await navigator.clipboard.writeText(textoCompartilhamento);
      toast({ title: "Texto copiado!", description: "Cole no WhatsApp ou outro app" });
    } catch (error) {
      // Fallback para navegadores antigos
      const textArea = document.createElement("textarea");
      textArea.value = textoCompartilhamento;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({ title: "Texto copiado!", description: "Cole no WhatsApp ou outro app" });
    }
  };

  const handleDownloadFlyer = () => {
    if (!flyerUrl) return;
    const link = document.createElement('a');
    link.href = flyerUrl;
    link.download = `flyer-${formData.titulo.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendFlyer = async () => {
    if (!flyerUrl || !grupoEnvio) {
      toast({ variant: "destructive", title: "Selecione um grupo para enviar" });
      return;
    }
    
    setIsSendingFlyer(true);
    try {
      const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
        body: {
          action: 'enviar_flyer',
          flyerUrl,
          grupo: grupoEnvio,
          evento: {
            titulo: formData.titulo,
            descricao: formData.descricao,
            data_evento: formData.data_evento,
            hora_inicio: formData.hora_inicio,
            local: formData.local,
          },
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ 
        title: "Flyer enviado!", 
        description: data.message 
      });
      setGrupoEnvio("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao enviar", description: error.message });
    } finally {
      setIsSendingFlyer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo.trim()) {
      toast({ variant: "destructive", title: "Título é obrigatório" });
      return;
    }

    if (!formData.data_evento && !formData.recorrente) {
      toast({ variant: "destructive", title: "Data é obrigatória para eventos não recorrentes" });
      return;
    }

    setIsLoading(true);
    try {
      const dataEvento = formData.data_evento || todayDateStr();
      const localCheck = formData.local_tipo === "na_igreja"
        ? (ambientes.find(a => a.id === formData.ambiente_id)?.nome || "Igreja Gileade")
        : formData.local || null;

      // Only check conflicts when a specific named environment is selected (not generic "Igreja Gileade")
      // to avoid false positives from timezone mismatches and generic location strings
      const ambienteSelecionado = formData.local_tipo === "na_igreja" && formData.ambiente_id
        ? ambientes.find(a => a.id === formData.ambiente_id)?.nome
        : null;

      if (ambienteSelecionado && !formData.recorrente) {
        // Check conflicts only for specific environments (not generic "Igreja Gileade")
        // Compare date strings directly (YYYY-MM-DD) to avoid timezone issues
        let conflictQuery = supabase
          .from("agenda_igreja")
          .select("id, titulo")
          .eq("ativo", true)
          .neq("status", "rejeitado")
          .eq("recorrente", false)
          .eq("local", ambienteSelecionado)
          .or(`data_evento.eq.${dataEvento},and(data_evento.lte.${dataEvento},data_fim.gte.${dataEvento})`);

        if (evento?.id) {
          conflictQuery = conflictQuery.neq("id", evento.id);
        }

        const { data: conflitos } = await conflictQuery;
        if (conflitos && conflitos.length > 0) {
          toast({
            variant: "destructive",
            title: "Conflito de agenda",
            description: `Já existe "${conflitos[0].titulo}" agendado para este local na mesma data.`,
          });
          setIsLoading(false);
          return;
        }
      }
      // Build bloqueio timestamps
      const bloqueioInicio = formData.bloqueio_inicio_data && formData.bloqueio_inicio_hora
        ? new Date(`${formData.bloqueio_inicio_data}T${formData.bloqueio_inicio_hora}:00`).toISOString()
        : null;
      const bloqueioFim = formData.bloqueio_fim_data && formData.bloqueio_fim_hora
        ? new Date(`${formData.bloqueio_fim_data}T${formData.bloqueio_fim_hora}:00`).toISOString()
        : null;

      // Determine local text
      const localText = formData.local_tipo === "na_igreja"
        ? (ambientes.find(a => a.id === formData.ambiente_id)?.nome || "Igreja Gileade")
        : formData.local || null;

      const payload = {
        titulo: formData.titulo.trim(),
        descricao: formData.descricao || null,
        data_evento: formData.data_evento || todayDateStr(),
        data_fim: formData.data_fim || null,
        hora_inicio: formData.hora_inicio || null,
        hora_fim: formData.hora_fim || null,
        local: localText,
        local_tipo: formData.local_tipo,
        ambiente_id: formData.local_tipo === "na_igreja" && formData.ambiente_id ? formData.ambiente_id : null,
        bloqueio_inicio: bloqueioInicio,
        bloqueio_fim: bloqueioFim,
        tipo_evento: formData.tipo_evento,
        genero_alvo: formData.genero_alvo,
        cor: formData.cor,
        recorrente: formData.recorrente,
        tipo_recorrencia: formData.recorrente 
          ? (formData.data_fim ? "semanal" : formData.tipo_recorrencia || null) 
          : null,
        dia_semana: formData.recorrente && formData.dia_semana ? parseInt(formData.dia_semana) : null,
        semana_mes: formData.recorrente && !formData.data_fim && formData.semana_mes ? parseInt(formData.semana_mes) : null,
        observacoes: formData.observacoes || null,
        flyer_url: flyerUrl,
        idade_minima: formData.idade_minima ? parseInt(formData.idade_minima) : null,
        idade_maxima: formData.idade_maxima ? parseInt(formData.idade_maxima) : null,
        tem_refeicao: formData.tem_refeicao,
        comentarios_refeicao: formData.comentarios_refeicao || null,
        tem_custo: formData.tem_custo,
        valor_custo: formData.valor_custo ? parseFloat(formData.valor_custo) : null,
        comentarios_custo: formData.comentarios_custo || null,
        valores_por_tipo: formData.tem_custo ? {
          membro: formData.valor_membro || null,
          nao_membro: formData.valor_nao_membro || null,
          familia: formData.valor_familia || null,
          equipe: formData.valor_equipe || null,
        } : null,
        vagas_por_tipo: formData.necessita_inscricao ? (() => {
          const vpt: Record<string, number> = {};
          if (formData.vagas_membro) vpt.membro = parseInt(formData.vagas_membro);
          if (formData.vagas_nao_membro) vpt.nao_membro = parseInt(formData.vagas_nao_membro);
          if (formData.vagas_familia) vpt.familia = parseInt(formData.vagas_familia);
          if (formData.vagas_equipe) vpt.equipe = parseInt(formData.vagas_equipe);
          return Object.keys(vpt).length > 0 ? vpt : null;
        })() : null,
        horarios_por_dia: horariosPorDia.length > 0 ? JSON.parse(JSON.stringify(horariosPorDia)) : null,
        limite_vagas: formData.limite_vagas ? parseInt(formData.limite_vagas) : null,
        visibilidade: formData.visibilidade || "publico",
        necessita_inscricao: formData.necessita_inscricao,
        link_grupo_whatsapp: formData.link_grupo_whatsapp?.trim()
          ? formData.link_grupo_whatsapp.trim()
          : null,
        ...(approvalMode ? { status: "pendente", solicitante_id: solicitanteId } : {}),
        campos_formulario: formData.necessita_inscricao ? camposFormulario : null,
      };

      const label = approvalMode ? "Agenda" : (mode === "compromisso" ? "Compromisso" : "Evento");

      let agendaId = evento?.id;

      if (evento) {
        const { error } = await supabase
          .from("agenda_igreja")
          .update(payload)
          .eq("id", evento.id);
        if (error) throw error;
        toast({ title: `${label} atualizado!` });
      } else {
        const { data: inserted, error } = await supabase.from("agenda_igreja").insert(payload).select("id").single();
        if (error) throw error;
        agendaId = inserted.id;
        toast({ title: approvalMode ? "Agenda criada e enviada para aprovação!" : `${label} criado!` });
      }

      // Save extra ambientes
      if (agendaId) {
        // Delete existing extras
        await supabase.from("agenda_ambientes").delete().eq("agenda_id", agendaId);
        
        // Insert new extras
        if (ambientesExtras.length > 0) {
          const extras = ambientesExtras
            .filter(ae => ae.ambiente_id)
            .map(ae => ({
              agenda_id: agendaId!,
              ambiente_id: ae.ambiente_id,
              bloqueio_inicio: ae.bloqueio_inicio_data && ae.bloqueio_inicio_hora
                ? new Date(`${ae.bloqueio_inicio_data}T${ae.bloqueio_inicio_hora}:00`).toISOString()
                : null,
              bloqueio_fim: ae.bloqueio_fim_data && ae.bloqueio_fim_hora
                ? new Date(`${ae.bloqueio_fim_data}T${ae.bloqueio_fim_hora}:00`).toISOString()
                : null,
            }));
          if (extras.length > 0) {
            const { error: extError } = await supabase.from("agenda_ambientes").insert(extras);
            if (extError) console.error("Erro ao salvar ambientes extras:", extError);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["agenda-recorrentes"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-igreja"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-recorrentes-homepage"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-pendentes-lideres"] });
      queryClient.invalidateQueries({ queryKey: ["meus-eventos-solicitados"] });
      queryClient.invalidateQueries({ queryKey: ["reservas-ambientes"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!evento) return;

    setIsDeleting(true);
    try {
      // Primeiro excluir registros dependentes
      await supabase.from("inscricoes_eventos").delete().eq("evento_id", evento.id);
      await supabase.from("agenda_ambientes").delete().eq("agenda_id", evento.id);
      
      const { error } = await supabase
        .from("agenda_igreja")
        .delete()
        .eq("id", evento.id);
      if (error) throw error;

      toast({ title: "Evento removido!" });
      queryClient.invalidateQueries({ queryKey: ["agenda-igreja"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-com-flyer-public"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-com-flyer-admin"] });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {approvalMode 
                ? "Criar Agenda"
                : evento 
                  ? (mode === "compromisso" ? "Editar Compromisso" : "Editar Evento") 
                  : (mode === "compromisso" ? "Novo Compromisso" : "Novo Evento")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{mode === "compromisso" ? "Tipo de Compromisso" : "Tipo de Evento"}</Label>
                <Select
                  value={formData.tipo_evento}
                  onValueChange={(v) => setFormData({ ...formData, tipo_evento: v, cor: getCorPorTipo(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(mode === "compromisso" ? TIPOS_COMPROMISSO : TIPOS_EVENTO).map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cor</Label>
                <Select
                  value={formData.cor}
                  onValueChange={(v) => setFormData({ ...formData, cor: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: formData.cor }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {CORES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            {/* Recorrência — apenas para COMPROMISSOS, logo após a descrição */}
            {mode === "compromisso" && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="recorrente"
                    checked={formData.recorrente}
                    onCheckedChange={(c) => setFormData({
                      ...formData,
                      recorrente: !!c,
                      ...(!c ? { tipo_recorrencia: "", dia_semana: "", semana_mes: "" } : { tipo_recorrencia: formData.tipo_recorrencia || "semanal" }),
                    })}
                  />
                  <Label htmlFor="recorrente" className="cursor-pointer font-medium">
                    Compromisso Recorrente
                  </Label>
                </div>

                {formData.recorrente && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">
                      {!formData.data_evento && !formData.data_fim
                        ? "Sem datas: a recorrência será aplicada a todos os períodos passados e futuros."
                        : !formData.data_fim
                        ? "Sem data de término: a recorrência começa na data de início e não tem fim."
                        : "Com início e término: a recorrência será aplicada apenas entre as datas informadas."}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={formData.tipo_recorrencia}
                          onValueChange={(v) => setFormData({ ...formData, tipo_recorrencia: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="mensal">Mensal</SelectItem>
                            <SelectItem value="semestral">Semestral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Dia da Semana</Label>
                        <Select
                          value={formData.dia_semana}
                          onValueChange={(v) => setFormData({ ...formData, dia_semana: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Domingo</SelectItem>
                            <SelectItem value="1">Segunda</SelectItem>
                            <SelectItem value="2">Terça</SelectItem>
                            <SelectItem value="3">Quarta</SelectItem>
                            <SelectItem value="4">Quinta</SelectItem>
                            <SelectItem value="5">Sexta</SelectItem>
                            <SelectItem value="6">Sábado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {(formData.tipo_recorrencia === "mensal" || formData.tipo_recorrencia === "semestral") && (
                        <div>
                          <Label className="text-xs">Semana do Mês</Label>
                          <Select
                            value={formData.semana_mes}
                            onValueChange={(v) => setFormData({ ...formData, semana_mes: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1ª Semana</SelectItem>
                              <SelectItem value="2">2ª Semana</SelectItem>
                              <SelectItem value="3">3ª Semana</SelectItem>
                              <SelectItem value="4">4ª Semana</SelectItem>
                              <SelectItem value="5">Última Semana</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Datas — opcionais quando recorrente */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Data Início
                  {!formData.recorrente && <span className="text-destructive ml-1">*</span>}
                  {formData.recorrente && <span className="text-xs text-muted-foreground ml-1">(opcional)</span>}
                </Label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !formData.data_evento && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_evento 
                          ? format(parseLocalDate(formData.data_evento), "dd/MM/yyyy", { locale: ptBR }) 
                          : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.data_evento ? parseLocalDate(formData.data_evento) : undefined}
                        onSelect={(date) => setFormData({ ...formData, data_evento: date ? format(date, "yyyy-MM-dd") : "" })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.data_evento && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setFormData({ ...formData, data_evento: "" })}
                      title="Limpar data"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>
                  Data Término
                  <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                </Label>
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !formData.data_fim && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_fim 
                          ? format(parseLocalDate(formData.data_fim), "dd/MM/yyyy", { locale: ptBR }) 
                          : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.data_fim ? parseLocalDate(formData.data_fim) : undefined}
                        onSelect={(date) => setFormData({ ...formData, data_fim: date ? format(date, "yyyy-MM-dd") : "" })}
                        disabled={(date) => formData.data_evento ? date < parseLocalDate(formData.data_evento) : false}
                        initialFocus
                        className="p-3 pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.data_fim && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setFormData({ ...formData, data_fim: "" })}
                      title="Limpar data"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hora_inicio">Horário Início</Label>
                <Input
                  id="hora_inicio"
                  type="time"
                  value={formData.hora_inicio}
                  onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hora_fim">Horário Término</Label>
                <Input
                  id="hora_fim"
                  type="time"
                  value={formData.hora_fim}
                  onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Horários por dia para eventos multidatas */}
            {formData.data_evento && formData.data_fim && formData.data_evento !== formData.data_fim && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Horários por Dia/Período</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHorariosPorDia([
                        ...horariosPorDia,
                        { data: formData.data_evento, periodo: "noite", hora_inicio: "19:00", hora_fim: "21:00" }
                      ]);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Horário
                  </Button>
                </div>
                
                {horariosPorDia.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Clique em "Adicionar Horário" para definir horários específicos para cada dia e período.
                  </p>
                )}
                
                {horariosPorDia.map((horario, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 items-end p-2 bg-background rounded border">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Select
                        value={horario.data}
                        onValueChange={(v) => {
                          const updated = [...horariosPorDia];
                          updated[index].data = v;
                          setHorariosPorDia(updated);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Data" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const dates: string[] = [];
                            if (formData.data_evento && formData.data_fim) {
                              const start = parseLocalDate(formData.data_evento);
                              const end = parseLocalDate(formData.data_fim);
                              let current = new Date(start);
                              while (current <= end) {
                                dates.push(format(current, "yyyy-MM-dd"));
                                current.setDate(current.getDate() + 1);
                              }
                            }
                            return dates.map(d => (
                              <SelectItem key={d} value={d}>
                                {format(parseLocalDate(d), "EEE, dd/MM", { locale: ptBR })}
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Período</Label>
                      <Select
                        value={horario.periodo}
                        onValueChange={(v) => {
                          const updated = [...horariosPorDia];
                          updated[index].periodo = v;
                          setHorariosPorDia(updated);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manha">Manhã</SelectItem>
                          <SelectItem value="tarde">Tarde</SelectItem>
                          <SelectItem value="noite">Noite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Início</Label>
                      <Input
                        type="time"
                        className="h-8 text-xs"
                        value={horario.hora_inicio}
                        onChange={(e) => {
                          const updated = [...horariosPorDia];
                          updated[index].hora_inicio = e.target.value;
                          setHorariosPorDia(updated);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Término</Label>
                      <Input
                        type="time"
                        className="h-8 text-xs"
                        value={horario.hora_fim}
                        onChange={(e) => {
                          const updated = [...horariosPorDia];
                          updated[index].hora_fim = e.target.value;
                          setHorariosPorDia(updated);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setHorariosPorDia(horariosPorDia.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Local do Evento */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <Label className="font-medium">Local de Realização *</Label>
              <RadioGroup
                value={formData.local_tipo}
                onValueChange={(v) => {
                  const tipo = v as "na_igreja" | "fora";
                  setFormData({
                    ...formData,
                    local_tipo: tipo,
                    local: tipo === "na_igreja" ? "Igreja Gileade" : "",
                    ambiente_id: "",
                    bloqueio_inicio_data: "",
                    bloqueio_inicio_hora: "",
                    bloqueio_fim_data: "",
                    bloqueio_fim_hora: "",
                  });
                }}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="na_igreja" id="local-igreja" />
                  <Label htmlFor="local-igreja" className="cursor-pointer">Na Igreja</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fora" id="local-fora" />
                  <Label htmlFor="local-fora" className="cursor-pointer">Fora da Igreja</Label>
                </div>
              </RadioGroup>

              {formData.local_tipo === "na_igreja" ? (
                <div className="space-y-3">
                  <div>
                    <Label>Ambiente</Label>
                    <div className="flex gap-1">
                      <Select
                        value={formData.ambiente_id || "none"}
                        onValueChange={(v) => setFormData({ ...formData, ambiente_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o ambiente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (Igreja Gileade)</SelectItem>
                          {ambientes.map((amb) => (
                            <SelectItem key={amb.id} value={amb.id}>{amb.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.ambiente_id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => setFormData({ ...formData, ambiente_id: "", bloqueio_inicio_data: "", bloqueio_inicio_hora: "", bloqueio_fim_data: "", bloqueio_fim_hora: "" })}
                          title="Limpar ambiente"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {formData.ambiente_id && (
                    <div className="space-y-2 p-2 bg-background rounded border">
                      <Label className="text-sm font-medium">Período de Bloqueio do Ambiente</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">De (data)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-9 text-sm",
                                  !formData.bloqueio_inicio_data && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {formData.bloqueio_inicio_data 
                                  ? format(parseLocalDate(formData.bloqueio_inicio_data), "dd/MM/yyyy", { locale: ptBR }) 
                                  : "DD/MM/AAAA"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.bloqueio_inicio_data ? parseLocalDate(formData.bloqueio_inicio_data) : undefined}
                                onSelect={(date) => setFormData({ ...formData, bloqueio_inicio_data: date ? format(date, "yyyy-MM-dd") : "" })}
                                initialFocus
                                className="p-3 pointer-events-auto"
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs">Às (hora)</Label>
                          <Input
                            type="time"
                            className="h-9"
                            value={formData.bloqueio_inicio_hora}
                            onChange={(e) => setFormData({ ...formData, bloqueio_inicio_hora: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Até (data)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-9 text-sm",
                                  !formData.bloqueio_fim_data && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {formData.bloqueio_fim_data 
                                  ? format(parseLocalDate(formData.bloqueio_fim_data), "dd/MM/yyyy", { locale: ptBR }) 
                                  : "DD/MM/AAAA"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.bloqueio_fim_data ? parseLocalDate(formData.bloqueio_fim_data) : undefined}
                                onSelect={(date) => setFormData({ ...formData, bloqueio_fim_data: date ? format(date, "yyyy-MM-dd") : "" })}
                                disabled={(date) => formData.bloqueio_inicio_data ? date < parseLocalDate(formData.bloqueio_inicio_data) : false}
                                initialFocus
                                className="p-3 pointer-events-auto"
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label className="text-xs">Às (hora)</Label>
                          <Input
                            type="time"
                            className="h-9"
                            value={formData.bloqueio_fim_hora}
                            onChange={(e) => setFormData({ ...formData, bloqueio_fim_hora: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ambientes extras */}
                  {ambientesExtras.map((ae, idx) => (
                    <div key={idx} className="space-y-2 p-2 bg-background rounded border mt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Ambiente Extra {idx + 1}</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => setAmbientesExtras(ambientesExtras.filter((_, i) => i !== idx))}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <Select
                        value={ae.ambiente_id}
                        onValueChange={(v) => {
                          const updated = [...ambientesExtras];
                          updated[idx] = { ...updated[idx], ambiente_id: v };
                          setAmbientesExtras(updated);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione o ambiente" />
                        </SelectTrigger>
                        <SelectContent>
                          {ambientes
                            .filter(a => a.id !== formData.ambiente_id && !ambientesExtras.some((other, i) => i !== idx && other.ambiente_id === a.id))
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {ae.ambiente_id && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Bloqueio de</Label>
                            <Input type="date" className="h-8 text-xs" value={ae.bloqueio_inicio_data}
                              onChange={(e) => {
                                const updated = [...ambientesExtras];
                                updated[idx] = { ...updated[idx], bloqueio_inicio_data: e.target.value };
                                setAmbientesExtras(updated);
                              }} />
                          </div>
                          <div>
                            <Label className="text-xs">Às</Label>
                            <Input type="time" className="h-8 text-xs" value={ae.bloqueio_inicio_hora}
                              onChange={(e) => {
                                const updated = [...ambientesExtras];
                                updated[idx] = { ...updated[idx], bloqueio_inicio_hora: e.target.value };
                                setAmbientesExtras(updated);
                              }} />
                          </div>
                          <div>
                            <Label className="text-xs">Até</Label>
                            <Input type="date" className="h-8 text-xs" value={ae.bloqueio_fim_data}
                              onChange={(e) => {
                                const updated = [...ambientesExtras];
                                updated[idx] = { ...updated[idx], bloqueio_fim_data: e.target.value };
                                setAmbientesExtras(updated);
                              }} />
                          </div>
                          <div>
                            <Label className="text-xs">Às</Label>
                            <Input type="time" className="h-8 text-xs" value={ae.bloqueio_fim_hora}
                              onChange={(e) => {
                                const updated = [...ambientesExtras];
                                updated[idx] = { ...updated[idx], bloqueio_fim_hora: e.target.value };
                                setAmbientesExtras(updated);
                              }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" className="mt-2 gap-1.5"
                    onClick={() => setAmbientesExtras([...ambientesExtras, {
                      ambiente_id: "", bloqueio_inicio_data: "", bloqueio_inicio_hora: "",
                      bloqueio_fim_data: "", bloqueio_fim_hora: "",
                    }])}>
                    <Plus className="w-3.5 h-3.5" /> Ambientes
                  </Button>
                </div>
              ) : (
                <div>
                  <Label htmlFor="local-endereco">Endereço completo</Label>
                  <Input
                    id="local-endereco"
                    placeholder="Rua, número, bairro, cidade..."
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Inscrição antecipada */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="necessita_inscricao"
                  checked={formData.necessita_inscricao}
                  onCheckedChange={(c) => setFormData({ ...formData, necessita_inscricao: !!c })}
                />
                <Label htmlFor="necessita_inscricao" className="cursor-pointer flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Necessita inscrição antecipada
                </Label>
              </div>
            </div>

            {/* Link de inscrição para Apresentação de Crianças */}
            {formData.tipo_evento === "apresentacao_criancas" && evento?.id && (
              <div className="p-3 bg-secondary/10 border border-secondary/30 rounded-lg space-y-2">
                <Label className="text-sm flex items-center gap-2 font-medium">
                  <LinkIcon className="w-4 h-4" />
                  Link de inscrição (Apresentação de Crianças)
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/inscricao/apresentacao/${evento.id}`}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      const link = `${window.location.origin}/inscricao/apresentacao/${evento.id}`;
                      try {
                        await navigator.clipboard.writeText(link);
                        toast({ title: "Link copiado!" });
                      } catch {
                        toast({ variant: "destructive", title: "Não foi possível copiar" });
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Envie este link aos pretendentes. Eles poderão selecionar os pais na lista
                  ou cadastrá-los caso ainda não sejam membros.
                </p>
              </div>
            )}

            {/* Link de divulgação / grupo de WhatsApp (todos os eventos) */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <Label htmlFor="link_grupo_whatsapp" className="text-sm flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Link do evento ou grupo de WhatsApp (opcional)
              </Label>
              <Input
                id="link_grupo_whatsapp"
                type="url"
                placeholder="https://chat.whatsapp.com/... ou https://forms.gle/..."
                value={formData.link_grupo_whatsapp}
                onChange={(e) =>
                  setFormData({ ...formData, link_grupo_whatsapp: e.target.value })
                }
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                Pode ser um link para grupo de WhatsApp, formulário externo ou página de informações.
                Será enviado por WhatsApp e e-mail aos participantes quando o ADM confirmar a inscrição.
              </p>
            </div>

            {/* Refeição */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tem_refeicao"
                  checked={formData.tem_refeicao}
                  onCheckedChange={(c) => setFormData({ ...formData, tem_refeicao: !!c })}
                />
                <Label htmlFor="tem_refeicao" className="cursor-pointer flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  Haverá refeição no local
                </Label>
              </div>
              
              {formData.tem_refeicao && (
                <Textarea
                  placeholder="Detalhes sobre a refeição (tipo, horário, contribuição...)"
                  value={formData.comentarios_refeicao}
                  onChange={(e) => setFormData({ ...formData, comentarios_refeicao: e.target.value })}
                  rows={2}
                />
              )}
            </div>

            {/* Custo */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tem_custo"
                  checked={formData.tem_custo}
                  onCheckedChange={(c) => setFormData({ ...formData, tem_custo: !!c })}
                />
                <Label htmlFor="tem_custo" className="cursor-pointer flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Evento tem custo/inscrição
                </Label>
              </div>
              
              {formData.tem_custo && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="valor_custo">Valor Padrão (R$)</Label>
                    <Input
                      id="valor_custo"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formData.valor_custo}
                      onChange={(e) => setFormData({ ...formData, valor_custo: e.target.value })}
                    />
                  </div>
                  <div className="p-3 bg-background rounded border space-y-2">
                    <Label className="text-sm font-medium">Valores por Tipo de Inscrição</Label>
                    <p className="text-xs text-muted-foreground">Deixe vazio para usar o valor padrão</p>
                    {[
                      { key: "membro", label: "Membro" },
                      { key: "nao_membro", label: "Não Membro" },
                      { key: "familia", label: "Líderes e Anfitriões" },
                      { key: "equipe", label: "Equipe (Apoio/Serviço)" },
                    ].map((tipo) => (
                      <div key={tipo.key} className="flex items-center gap-2">
                        <Label className="w-40 text-sm">{tipo.label}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Valor padrão"
                          className="h-8"
                          value={(formData as any)[`valor_${tipo.key}`] || ""}
                          onChange={(e) => setFormData({ ...formData, [`valor_${tipo.key}`]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Detalhes sobre o custo (formas de pagamento, o que inclui...)"
                    value={formData.comentarios_custo}
                    onChange={(e) => setFormData({ ...formData, comentarios_custo: e.target.value })}
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="limite_vagas">Limite Total de Vagas</Label>
              <Input
                id="limite_vagas"
                type="number"
                min="1"
                placeholder="Sem limite"
                value={formData.limite_vagas}
                onChange={(e) => setFormData({ ...formData, limite_vagas: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para sem limite de vagas
              </p>
            </div>

            {formData.necessita_inscricao && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <Label className="font-medium">Construtor de Formulário de Inscrição</Label>
                <p className="text-xs text-muted-foreground">Selecione os campos que deseja exibir no formulário de inscrição</p>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCamposFormulario([...ALL_CAMPOS_KEYS])}>
                    <Check className="w-3 h-3 mr-1" /> Marcar Todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCamposFormulario([])}>
                    <X className="w-3 h-3 mr-1" /> Desmarcar Todos
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPOS_FORMULARIO_OPTIONS.map((campo) => (
                    <div key={campo.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`campo-${campo.key}`}
                        checked={camposFormulario.includes(campo.key)}
                        onCheckedChange={(checked) => {
                          setCamposFormulario(prev =>
                            checked ? [...prev, campo.key] : prev.filter(k => k !== campo.key)
                          );
                        }}
                      />
                      <Label htmlFor={`campo-${campo.key}`} className="text-sm cursor-pointer">{campo.label}</Label>
                    </div>
                  ))}
                </div>

                <Label className="font-medium mt-4">Vagas por Tipo de Inscrição</Label>
                <p className="text-xs text-muted-foreground">Deixe vazio para não limitar por tipo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Membro</Label>
                    <Input type="number" min="0" placeholder="Sem limite" value={formData.vagas_membro} onChange={(e) => setFormData({ ...formData, vagas_membro: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Não Membro</Label>
                    <Input type="number" min="0" placeholder="Sem limite" value={formData.vagas_nao_membro} onChange={(e) => setFormData({ ...formData, vagas_nao_membro: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Líderes / Anfitriões</Label>
                    <Input type="number" min="0" placeholder="Sem limite" value={formData.vagas_familia} onChange={(e) => setFormData({ ...formData, vagas_familia: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Equipe</Label>
                    <Input type="number" min="0" placeholder="Sem limite" value={formData.vagas_equipe} onChange={(e) => setFormData({ ...formData, vagas_equipe: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Visibilidade - exibir sempre */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-3">
              <Label className="font-medium">Visibilidade da Agenda *</Label>
              <RadioGroup
                value={formData.visibilidade}
                onValueChange={(v) => setFormData({ ...formData, visibilidade: v })}
                className="space-y-2"
              >
                <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/80">
                  <RadioGroupItem value="publico" id="vis-publico" className="mt-0.5" />
                  <div>
                    <Label htmlFor="vis-publico" className="font-medium cursor-pointer">Evento Público</Label>
                    <p className="text-xs text-muted-foreground">Aberto a todos. Aparece na aba de Eventos após aprovação.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/80">
                  <RadioGroupItem value="interno" id="vis-interno" className="mt-0.5" />
                  <div>
                    <Label htmlFor="vis-interno" className="font-medium cursor-pointer">Interno</Label>
                    <p className="text-xs text-muted-foreground">Restrito à igreja. Aparece apenas na Programação após aprovação.</p>
                  </div>
              </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Público Alvo</Label>
              <Select
                value={formData.genero_alvo}
                onValueChange={(v) => setFormData({ ...formData, genero_alvo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="homens">Homens</SelectItem>
                  <SelectItem value="mulheres">Mulheres</SelectItem>
                  <SelectItem value="jovens">Jovens</SelectItem>
                  <SelectItem value="adolescentes">Adolescentes</SelectItem>
                  <SelectItem value="criancas">Crianças</SelectItem>
                  <SelectItem value="somente_convidados">Somente Convidados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações / Comentários</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
                placeholder="Adicione notas sobre este evento..."
              />
            </div>

            {/* Flyer Section - apenas para eventos */}
            {mode !== "compromisso" && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                <Label className="font-medium">Flyer do Evento</Label>
                
                {/* Flyer pendente de aprovação */}
                {flyerPendente && (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={flyerPendente} 
                        alt="Flyer gerado" 
                        className="w-full max-h-48 object-contain rounded-lg border border-amber-400"
                      />
                      <div className="absolute bottom-2 left-2">
                        <img src={logoGileade} alt="Logo Gileade" className="w-8 h-8 rounded-full border-2 border-white shadow" />
                      </div>
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                        Pendente
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setFlyerUrl(flyerPendente);
                          setFlyerPendente(null);
                          toast({ title: "Flyer aceito!" });
                        }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Aceitar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setFlyerPendente(null);
                          toast({ title: "Flyer descartado" });
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Descartar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateFlyer}
                        disabled={isGeneratingFlyer}
                      >
                        {isGeneratingFlyer ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Flyer aceito */}
                {flyerUrl && !flyerPendente ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={flyerUrl} 
                        alt="Flyer do evento" 
                        className="w-full max-h-48 object-contain rounded-lg border"
                      />
                      <div className="absolute bottom-2 left-2">
                        <img src={logoGileade} alt="Logo Gileade" className="w-8 h-8 rounded-full border-2 border-white shadow" />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 w-6 h-6"
                        onClick={() => setFlyerUrl(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {/* Botões de ação do flyer */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadFlyer}
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Flyer
                      </Button>
                    </div>
                    
                    {/* Envio para grupos */}
                    <div className="flex gap-2">
                      <Select value={grupoEnvio} onValueChange={setGrupoEnvio}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Enviar para..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="homens">Homens</SelectItem>
                          <SelectItem value="mulheres">Mulheres</SelectItem>
                          <SelectItem value="jovens">Jovens</SelectItem>
                          <SelectItem value="adolescentes">Adolescentes</SelectItem>
                          <SelectItem value="criancas">Crianças</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleSendFlyer}
                        disabled={isSendingFlyer || !grupoEnvio}
                      >
                        {isSendingFlyer ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Enviar
                      </Button>
                    </div>
                  </div>
                ) : !flyerPendente && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFlyerUpload}
                          className="hidden"
                          id="flyer-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById("flyer-upload")?.click()}
                          disabled={isUploadingFlyer}
                        >
                          {isUploadingFlyer ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={templateFlyer} onValueChange={setTemplateFlyer}>
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="moderno">Moderno</SelectItem>
                            <SelectItem value="minimalista">Minimalista</SelectItem>
                            <SelectItem value="festivo">Festivo</SelectItem>
                            <SelectItem value="elegante">Elegante</SelectItem>
                            <SelectItem value="corporativo">Corporativo</SelectItem>
                            <SelectItem value="simples">📝 Texto</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleGenerateFlyer}
                          disabled={isGeneratingFlyer || !formData.titulo || !formData.data_evento}
                        >
                          {isGeneratingFlyer ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            templateFlyer === "simples" ? <MessageSquare className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          {templateFlyer === "simples" ? "Gerar Flyer Informativo" : "Gerar Flyer"}
                        </Button>
                      </div>
                    </div>

                    {/* Texto de compartilhamento gerado */}
                    {textoCompartilhamento && flyerPendente && (
                      <div className="space-y-2 mt-3">
                        {/* Imagem do flyer informativo */}
                        <div className="relative">
                          <img
                            src={flyerPendente}
                            alt="Flyer gerado"
                            className="w-full rounded-lg border shadow-sm"
                          />
                        </div>
                        
                        {/* Texto para copiar */}
                        <div className="relative">
                          <pre className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-48 overflow-y-auto border font-sans">
                            {textoCompartilhamento}
                          </pre>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setTextoCompartilhamento(null);
                              setFlyerPendente(null);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Ações */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = flyerPendente;
                              link.download = `flyer-${formData.titulo.replace(/\s+/g, '-').toLowerCase()}.svg`;
                              link.target = '_blank';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar Imagem
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCopyTexto}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar Texto
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setFlyerUrl(flyerPendente);
                              setFlyerPendente(null);
                              setTextoCompartilhamento(null);
                              toast({ title: "Flyer aceito!" });
                            }}
                            disabled={isUploadingFlyer}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Aceitar como Flyer Oficial
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateFlyer}
                            disabled={isGeneratingFlyer}
                            title="Gerar novamente"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


            <div className="flex justify-between pt-4 border-t">
              {evento && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="secondary" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {approvalMode ? "Solicitar Aprovação" : (evento ? "Salvar" : "Criar")}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{evento?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
