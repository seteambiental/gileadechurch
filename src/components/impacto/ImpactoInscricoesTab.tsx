import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency, formatPhone } from "@/lib/masks";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/date-utils";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Printer, Tag, Pencil, Search, Download, FileSpreadsheet, FileText, Columns3, X, CheckCircle, Archive, DollarSign } from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import { Input } from "@/components/ui/input";
import ImpactoInscricaoFormDialog from "./ImpactoInscricaoFormDialog";
import FinalizarEventoDialog from "./FinalizarEventoDialog";
import EnvioEmergenciaDialog from "./EnvioEmergenciaDialog";
import ApresentacaoCriancasInscricoesPanel from "./ApresentacaoCriancasInscricoesPanel";
import { exportGenericToExcel, exportGenericToPDF } from "@/lib/export";
import { fuzzyMatch } from "@/lib/text-utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface ImpactoInscricoesTabProps {
  eventoSelecionado?: string;
  onEventoChange?: (id: string) => void;
}

const FORMAS_PAGAMENTO_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  vale: "Vale",
  misto: "Misto",
};

const TIPOS_INSCRICAO_LABELS: Record<string, string> = {
  membro: "Membro",
  nao_membro: "Não membro",
  familia: "Família",
  equipe: "Equipe (apoio/serviço)",
  ministrador: "Ministrador",
};

// All available column keys (used for both table and export)
const ALL_COLUMNS = [
  { key: "referencia", label: "Ref." },
  { key: "nome", label: "Nome" },
  { key: "tipo", label: "Tipo" },
  { key: "genero", label: "Gênero" },
  { key: "telefone", label: "Contato" },
  { key: "local", label: "Casa Refúgio / Condomínio" },
  { key: "forma_pagamento", label: "Forma Pagamento" },
  { key: "valor_inscricao", label: "Valor Inscrição" },
  { key: "valor_pago", label: "Valor Pago" },
  { key: "a_pagar", label: "A Pagar" },
  { key: "status", label: "Status" },
  { key: "contato_emergencia", label: "Contato Emergência" },
  { key: "telefone_emergencia", label: "Tel. Emergência" },
] as const;

type ColumnKey = typeof ALL_COLUMNS[number]["key"];

const DEFAULT_VISIBLE_COLUMNS = new Set<string>(
  ALL_COLUMNS.map((c) => c.key)
);

const ImpactoInscricoesTab = ({ eventoSelecionado, onEventoChange }: ImpactoInscricoesTabProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInscricao, setEditingInscricao] = useState<any>(null);
  const [selectedEventoId, setSelectedEventoIdLocal] = useState(eventoSelecionado || "");
  const setSelectedEventoId = (id: string) => {
    setSelectedEventoIdLocal(id);
    onEventoChange?.(id);
  };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchNome, setSearchNome] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_COLUMNS));
  const GENERO_OPTIONS = ["Masculino", "Feminino", "—"];
  const [filtroGenero, setFiltroGenero] = useState<Set<string>>(new Set(GENERO_OPTIONS));
  const TIPO_OPTIONS = ["Membro", "Não membro", "Família", "Líderes e Anfitriões", "Equipe (apoio/serviço)", "Ministrador", "—"];
  const [filtroTipo, setFiltroTipo] = useState<Set<string>>(new Set(TIPO_OPTIONS));
  const [deletingInscricao, setDeletingInscricao] = useState<{ id: string; source?: string; nome: string; member_id?: string | null; evento_id?: string } | null>(null);
  const [finalizarOpen, setFinalizarOpen] = useState(false);
  const [emergenciaOpen, setEmergenciaOpen] = useState(false);
  const [etiquetasDialogOpen, setEtiquetasDialogOpen] = useState(false);
  const [etiquetasGrupo, setEtiquetasGrupo] = useState<"participantes" | "equipe">("participantes");
  const [etiquetasNumeros, setEtiquetasNumeros] = useState("");
  useEffect(() => {
    if (eventoSelecionado) setSelectedEventoIdLocal(eventoSelecionado);
  }, [eventoSelecionado]);
  // Fetch impacto_eventos (unified dropdown)
  const { data: impactoEventos = [] } = useQuery({
    queryKey: ["impacto-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_eventos")
        .select("*")
        .eq("ativo", true)
        .eq("finalizado", false)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch agenda events with inscricao enabled (non-recurring)
  const { data: agendaEventos } = useQuery({
    queryKey: ["agenda-eventos-inscricao-for-impacto"],
    queryFn: async () => {
      const [agendaRes, finalizadosRes] = await Promise.all([
        supabase
          .from("agenda_igreja")
          .select("id, titulo, data_evento, data_fim, local, limite_vagas, ativo, tem_custo, valores_por_tipo, tipo_evento")
          .eq("necessita_inscricao", true)
          .eq("recorrente", false)
          .order("data_evento", { ascending: false }),
        supabase
          .from("impacto_eventos")
          .select("id")
          .eq("finalizado", true),
      ]);
      if (agendaRes.error) throw agendaRes.error;
      if (finalizadosRes.error) throw finalizadosRes.error;

      const finalizadosSet = new Set((finalizadosRes.data || []).map((e) => e.id));
      return (agendaRes.data || []).filter((e) => !finalizadosSet.has(e.id));
    },
  });

  // Unify both sources into a single list for the dropdown
  const eventos = useMemo(() => {
    // Deduplicar impacto_eventos por título (mantém o primeiro de cada título)
    const seenTitles = new Set<string>();
    const impactoDeduped = (impactoEventos || []).filter((e) => {
      const key = e.titulo?.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    const impacto = impactoDeduped.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_inicio,
      source: "impacto" as const,
    }));
    const agenda = (agendaEventos || []).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_inicio: e.data_evento,
      source: "agenda" as const,
    }));
    // Deduplicate by ID first, then by normalized title (impacto takes priority)
    const impactoIds = new Set(impacto.map((e) => e.id));
    const impactoTitlesNorm = new Set(impacto.map((e) => e.titulo?.trim().toLowerCase()));
    const uniqueAgenda = agenda.filter((e) => !impactoIds.has(e.id) && !impactoTitlesNorm.has(e.titulo?.trim().toLowerCase()));
    return [...impacto, ...uniqueAgenda].sort((a, b) =>
      new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime()
    );
  }, [impactoEventos, agendaEventos]);

  // Determine if selected event is from agenda_igreja or impacto_eventos
  const selectedEventoSource = useMemo(
    () => eventos.find((e) => e.id === selectedEventoId)?.source || "impacto",
    [eventos, selectedEventoId]
  );

  // Fetch from impacto_inscricoes (admin inserts from within the app)
  const { data: rawImpactoInscricoes, isLoading: loadingImpacto } = useQuery({
    queryKey: ["impacto-inscricoes", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select(`*, member:members(id, full_name, photo_url, whatsapp, casa_refugio_id)`)
        .eq("evento_id", selectedEventoId) as any;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEventoId,
  });

  // Fetch from inscricoes_eventos — apenas as NÃO aprovadas (pendentes de aprovação)
  // Aprovadas já foram espelhadas em impacto_inscricoes pelo fluxo de aprovação
  const { data: rawAgendaInscricoes, isLoading: loadingAgenda } = useQuery({
    queryKey: ["agenda-inscricoes", selectedEventoId],
    queryFn: async () => {
      if (!selectedEventoId) return [];
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select(`id, nome_participante, telefone_contato, tipo_inscricao, status_pagamento, member_id, evento_id, member:members(id, full_name, photo_url, whatsapp, casa_refugio_id)`)
        .eq("evento_id", selectedEventoId)
        .eq("aprovado", false);
      if (error) throw error;
      return (data || []).map((i: any) => ({
        ...i,
        member_id: i.member_id,
        nome: i.nome_participante,
        telefone: i.telefone_contato,
        status_pagamento: i.status_pagamento || "pendente",
        tipo_inscricao: i.tipo_inscricao || "membro",
        source: "agenda_inscricao",
      }));
    },
    enabled: !!selectedEventoId,
  });


  // Fetch selected event details for valores_por_tipo
  const selectedEventoDetalhes = useMemo(() => {
    if (!selectedEventoId) return null;
    // Try agenda first
    const agenda = agendaEventos?.find((e) => e.id === selectedEventoId);
    if (agenda) return agenda;
    // Try impacto
    const impacto = impactoEventos?.find((e: any) => e.id === selectedEventoId);
    return impacto || null;
  }, [selectedEventoId, agendaEventos, impactoEventos]);

  const isLoading = loadingImpacto || loadingAgenda;

  const resolveGeneroLabel = (inscricao: any): string => {
    const g = inscricao.genero || inscricao.member?.genero;
    if (!g) return "—";
    return { M: "Masculino", F: "Feminino", masculino: "Masculino", feminino: "Feminino" }[g] || g;
  };

  const inscricoes = useMemo(() => {
    const impacto = rawImpactoInscricoes || [];
    const agenda = rawAgendaInscricoes || [];

    const impactoMemberIds = new Set(impacto.map((i: any) => i.member_id).filter(Boolean));
    const impactoNomes = new Set(
      impacto.map((i: any) =>
        (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      ).filter(Boolean)
    );

    const uniqueAgenda = agenda.filter((i: any) => {
      if (i.member_id && impactoMemberIds.has(i.member_id)) return false;
      const nomeNorm = (i.nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      if (nomeNorm && impactoNomes.has(nomeNorm)) return false;
      return true;
    });

    let all = [...impacto, ...uniqueAgenda];
    all = all.sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));

    // Gender filter
    if (filtroGenero.size < GENERO_OPTIONS.length) {
      all = all.filter((i: any) => filtroGenero.has(resolveGeneroLabel(i)));
    }

    // Tipo filter
    if (filtroTipo.size < TIPO_OPTIONS.length) {
      all = all.filter((i: any) => {
        const tipoLabel = TIPOS_INSCRICAO_LABELS[i.tipo_inscricao] || i.tipo_inscricao || "—";
        return filtroTipo.has(tipoLabel);
      });
    }

    if (!searchNome.trim()) return all;
    const q = searchNome.trim();
    const digits = q.replace(/\D/g, "");
    return all.filter((i: any) => {
      const nome = i.nome || i.member?.full_name || "";
      const responsavel = i.nome_responsavel || "";
      if (fuzzyMatch(nome, q)) return true;
      if (responsavel && fuzzyMatch(responsavel, q)) return true;
      if (digits) {
        const tel = (i.telefone || i.telefone_emergencia || i.member?.whatsapp || "").replace(/\D/g, "");
        if (tel.includes(digits)) return true;
      }
      return false;
    });
  }, [rawImpactoInscricoes, rawAgendaInscricoes, searchNome, filtroGenero, filtroTipo]);

  // Keep selected IDs in sync with currently visible inscrições
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => inscricoes.some((i) => i.id === id)));
  }, [inscricoes]);

  // Fetch casas refugio for name/condominio lookup
  const { data: casasRefugio = [] } = useQuery({
    queryKey: ["casas-refugio-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("casas_refugio")
        .select("id, name, condominio");
      if (error) throw error;
      return data;
    },
  });

  // Fetch condominios for condominio name lookup from CR
  const { data: condominios = [] } = useQuery({
    queryKey: ["condominios-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  const getLocationLabel = (inscricao: any) => {
    const member = inscricao.member;
    if (!member) return "-";
    
    if (member.casa_refugio_id) {
      const cr = casasRefugio.find((c) => c.id === member.casa_refugio_id);
      if (cr) return cr.name;
    }
    
    return "-";
  };

   const getPhone = (inscricao: any) => {
    const raw = inscricao.telefone || inscricao.member?.whatsapp || "";
    return raw ? formatPhone(raw) : "-";
  };

  const getValorPago = (inscricao: any): number => {
    const pagamentos = inscricao.pagamentos as any[] | null;
    if (pagamentos && pagamentos.length > 0) {
      return pagamentos.reduce((sum: number, p: any) => sum + (parseFloat(p.valor) || 0), 0);
    }
    return parseFloat(inscricao.valor_pago) || 0;
  };

  // Calculate "A Pagar" = valor_inscricao - valorPago
  const getValorAPagar = (inscricao: any): number => {
    const valorInscricao = parseFloat(inscricao.valor_inscricao) || 0;
    const valorPago = getValorPago(inscricao);
    const diff = valorInscricao - valorPago;
    return diff > 0 ? diff : 0;
  };

  // Get valor_inscricao from event's valores_por_tipo based on tipo_inscricao
  const getValorInscricaoEvento = (inscricao: any): number | null => {
    if (inscricao.valor_inscricao != null) return parseFloat(inscricao.valor_inscricao);
    const valores = selectedEventoDetalhes?.valores_por_tipo as Record<string, number> | null;
    if (!valores) return null;
    const tipo = inscricao.tipo_inscricao || "membro";
    const raw = valores[tipo] ?? null;
    return raw != null ? parseFloat(String(raw)) : null;
  };

  const deleteMutation = useMutation({
    mutationFn: async ({ id, source, member_id, nome, evento_id }: { id: string; source?: string; member_id?: string | null; nome?: string; evento_id?: string }) => {
      const isAgenda = source === "agenda_inscricao";
      const primaryTable = isAgenda ? "inscricoes_eventos" : "impacto_inscricoes";

      // Delete from primary table
      const { error } = await supabase.from(primaryTable as any).delete().eq("id", id);
      if (error) throw error;

      // Delete counterpart in BOTH tables to ensure no ghost records remain
      const evId = evento_id || selectedEventoId;
      if (evId) {
        // Always try to delete by member_id from both tables
        if (member_id) {
          await supabase.from("impacto_inscricoes").delete().eq("evento_id", evId).eq("member_id", member_id);
          await supabase.from("inscricoes_eventos").delete().eq("evento_id", evId).eq("member_id", member_id);
        }
        // Also try to delete by name (handles cases without member_id or name-only records)
        if (nome) {
          const nomeNorm = nome.trim();
          if (nomeNorm) {
            await supabase.from("impacto_inscricoes").delete().eq("evento_id", evId).ilike("nome", `%${nomeNorm}%`);
            await supabase.from("inscricoes_eventos").delete().eq("evento_id", evId).ilike("nome_participante", `%${nomeNorm}%`);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Inscrição removida!");
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", selectedEventoId] });
      queryClient.invalidateQueries({ queryKey: ["agenda-inscricoes", selectedEventoId] });
      queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes-count"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes-eventos-pending-count"] });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(inscricoes.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const handleEdit = (inscricao: any) => {
    setEditingInscricao(inscricao);
    setFormOpen(true);
  };

  const handleNewInscricao = () => {
    setEditingInscricao(null);
    setFormOpen(true);
  };

  const printCrachas = async () => {
    const selected = inscricoes.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma inscrição");
      return;
    }

    // Fetch church logo
    const { data: configData } = await supabase
      .from("igreja_config")
      .select("logo_url, logo_dark_url")
      .limit(1)
      .single();
    const logoUrl = configData?.logo_dark_url || configData?.logo_url || "";

    const evento = eventos?.find((e) => e.id === selectedEventoId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const crachasHtml = selected.map((inscricao) => `
      <div class="cracha">
        ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
        <div class="evento">${evento?.titulo || "Impacto"}</div>
        <div class="nome">${inscricao.nome}</div>
        ${inscricao.referencia ? `<div class="ref">${inscricao.referencia}</div>` : ''}
        ${inscricao.genero ? `<div class="info">${inscricao.genero === 'M' ? 'Masculino' : 'Feminino'}</div>` : ''}
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Crachás - ${evento?.titulo}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .container { display: flex; flex-wrap: wrap; gap: 10px; }
        .cracha { width: 85mm; height: 55mm; border: 2px solid #333; border-radius: 8px; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-inside: avoid; }
        .logo { max-width: 60px; max-height: 30px; object-fit: contain; margin-bottom: 4px; }
        .evento { font-size: 10px; color: #666; margin-bottom: 5px; text-transform: uppercase; }
        .nome { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .ref { font-size: 12px; font-weight: bold; color: #444; letter-spacing: 1px; }
        .info { font-size: 12px; color: #666; }
      </style></head><body>
      <div class="container">${crachasHtml}</div>
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const parseNumeros = (txt: string): Set<number> | null => {
    const t = (txt || "").trim();
    if (!t) return null;
    const set = new Set<number>();
    t.split(",").forEach((part) => {
      const p = part.trim();
      if (!p) return;
      const range = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        const a = parseInt(range[1], 10);
        const b = parseInt(range[2], 10);
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        for (let n = lo; n <= hi; n++) set.add(n);
      } else if (/^\d+$/.test(p)) {
        set.add(parseInt(p, 10));
      }
    });
    return set.size ? set : null;
  };

  const handleGerarEtiquetas = () => {
    const tiposGrupo = etiquetasGrupo === "equipe"
      ? ["equipe", "ministrador", "familia"]
      : ["membro", "nao_membro"];
    const numeros = parseNumeros(etiquetasNumeros);
    const lista = inscricoes
      .filter((i: any) => tiposGrupo.includes(i.tipo_inscricao || "membro"))
      .filter((i: any) => {
        if (!numeros) return true;
        const n = parseInt(String(i.referencia || "").replace(/\D/g, ""), 10);
        return Number.isFinite(n) && numeros.has(n);
      })
      .sort((a: any, b: any) => {
        const na = parseInt(String(a.referencia || "9999"), 10);
        const nb = parseInt(String(b.referencia || "9999"), 10);
        return na - nb;
      });
    if (lista.length === 0) {
      toast.error("Nenhuma inscrição encontrada para os critérios.");
      return;
    }
    setEtiquetasDialogOpen(false);
    printEtiquetas(lista);
  };

  const printEtiquetas = async (listOverride?: any[]) => {
    const selected = listOverride && listOverride.length
      ? listOverride
      : inscricoes.filter((i) => selectedIds.includes(i.id));
    if (selected.length === 0) {
      toast.error("Selecione pelo menos uma inscrição");
      return;
    }

    // Logo do Impacto (servida estaticamente)
    const logoUrl = `${window.location.origin}/images/impacto-logo.png`;

    const evento = eventos?.find((e) => e.id === selectedEventoId);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Etiquetas de Mala - ${evento?.titulo}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>
      <style>
        /* Pimaco 6081/6181 - Folha Carta 21.59 x 27.94 cm
           Margens: topo 15mm, base 10mm, laterais 3mm, gutter central 3mm */
        @page { size: letter; margin: 0; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
        .page {
          width: 215.9mm;
          height: 279.4mm;
          padding: 15mm 3mm 10mm 3mm;
          box-sizing: border-box;
          page-break-after: always;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
        }
        .page:last-child { page-break-after: auto; }
        .cell {
          width: 101.6mm;
          height: 25.4mm;
          margin-right: 3mm;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .cell:nth-child(2n) { margin-right: 0; }
        .etiqueta {
          width: 101.6mm;
          height: 25.4mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 1mm 2.5mm;
          overflow: hidden;
          background: #000;
          color: #fff;
          border-radius: 1mm;
        }
        .logo-area { width: 26mm; min-width: 26mm; display: flex; align-items: center; justify-content: center; }
        .logo { max-width: 25mm; max-height: 22mm; object-fit: contain; }
        .info-area { flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden; padding-left: 2mm; }
        .nome { font-size: 10pt; font-weight: bold; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
        .ref { font-size: 8pt; font-weight: bold; color: #fff; letter-spacing: 0.5px; margin-top: 0.5mm; opacity: 0.9; }
        .barcode-area { display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 1mm; padding: 0.5mm 1mm; margin-top: 1mm; }
        .barcode-area svg { width: 100%; height: 8mm; display: block; }
      </style></head><body>
      ${(() => {
        // 20 labels per page (2 cols x 10 rows)
        const pages: string[] = [];
        for (let i = 0; i < selected.length; i += 20) {
          const pageLabels = selected.slice(i, i + 20);
          const cells = pageLabels.map((inscricao) => {
            const codigo = inscricao.referencia || inscricao.id?.slice(0, 8).toUpperCase() || '';
            return `
            <div class="cell">
              <div class="etiqueta">
                <div class="logo-area">
                  <img class="logo" src="${logoUrl}" alt="Impacto" />
                </div>
                <div class="info-area">
                  <div class="nome">${inscricao.nome.toUpperCase()}</div>
                  ${codigo ? '<div class="ref">' + codigo + '</div>' : ''}
                  ${codigo ? '<div class="barcode-area"><svg class="bc" data-code="' + codigo + '"></svg></div>' : ''}
                </div>
              </div>
            </div>
          `;
          }).join("");
          pages.push('<div class="page">' + cells + '</div>');
        }
        return pages.join("");
      })()}
      <script>
        window.onload = function() {
          try {
            document.querySelectorAll('svg.bc').forEach(function(el){
              var code = el.getAttribute('data-code') || '';
              if (!code) return;
              window.JsBarcode(el, code, {
                format: 'CODE128',
                displayValue: false,
                margin: 0,
                height: 30,
                width: 1.4,
                background: '#ffffff',
                lineColor: '#000000'
              });
            });
          } catch(e) { console.error(e); }
          setTimeout(function(){ window.print(); }, 350);
        };
      </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const buildExportColumns = () => {
    const allCols: Record<string, any> = {
      referencia: { header: "Ref.", accessor: "referencia", format: (v: any) => v || "—" },
      nome: { header: "Nome", accessor: "nome" },
      tipo: { header: "Tipo", accessor: (row: any) => TIPOS_INSCRICAO_LABELS[row.tipo_inscricao] || row.tipo_inscricao || "Membro" },
      genero: { header: "Gênero", accessor: (row: any) => {
        const g = row.genero || row.member?.genero;
        if (!g) return "—";
        return { M: "Masculino", F: "Feminino", masculino: "Masculino", feminino: "Feminino" }[g] || g;
      }},
      telefone: { header: "Contato", accessor: (row: any) => getPhone(row) },
      local: { header: "Casa Refúgio / Condomínio", accessor: (row: any) => getLocationLabel(row) },
      forma_pagamento: { header: "Forma Pagamento", accessor: (row: any) => row.forma_pagamento ? (FORMAS_PAGAMENTO_LABELS[row.forma_pagamento] || row.forma_pagamento) : "—" },
      valor_inscricao: { header: "Valor Inscrição", type: 'currency' as const, accessor: (row: any) => {
        const v = getValorInscricaoEvento(row);
        return v != null ? v : 0;
      }},
      valor_pago: { header: "Valor Pago", type: 'currency' as const, accessor: (row: any) => getValorPago(row) },
      a_pagar: { header: "A Pagar", type: 'currency' as const, accessor: (row: any) => {
        return getValorAPagar(row);
      }},
      status: { header: "Status", accessor: (row: any) => ({ pago: "Pago", parcial: "Parcial" }[row.status_pagamento] || "Pendente") },
      contato_emergencia: { header: "Contato Emergência", accessor: (row: any) => row.nome_responsavel || "—" },
      telefone_emergencia: { header: "Tel. Emergência", accessor: (row: any) => {
        const t = row.telefone_emergencia || row.telefone_responsavel;
        return t ? formatPhone(t) : "—";
      }},
    };
    return ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)).map((c) => allCols[c.key]);
  };

  const eventoNome = eventos?.find((e) => e.id === selectedEventoId)?.titulo || "inscricoes";

  const pendingRowStyle = (row: any) => {
    const status = String(row.status_pagamento || "").toLowerCase().trim();
    if (!status || status === "pendente") {
      return { fillColor: "#FFF3CD", fontColor: "#856404" };
    }
    return null;
  };

  const handleExportExcel = async () => {
    if (!inscricoes.length) { toast.error("Nenhuma inscrição para exportar."); return; }
    await exportGenericToExcel(inscricoes, buildExportColumns(), `Inscricoes_${eventoNome}`, "Inscrições", pendingRowStyle);
  };

  const handleExportPDF = () => {
    if (!inscricoes.length) { toast.error("Nenhuma inscrição para exportar."); return; }
    exportGenericToPDF(inscricoes, buildExportColumns(), `Inscricoes_${eventoNome}`, `Inscrições — ${eventoNome}`, pendingRowStyle);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isCol = (key: string) => visibleColumns.has(key);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-green-600 text-white">Pago</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-600 text-white">Parcial</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  // Apresentação de Crianças usa tabela e fluxo dedicados
  const selectedAgendaEvent = agendaEventos?.find((e: any) => e.id === selectedEventoId);
  if (selectedAgendaEvent && (selectedAgendaEvent as any).tipo_evento === "apresentacao_criancas") {
    return (
      <ApresentacaoCriancasInscricoesPanel
        eventos={eventos}
        selectedEventoId={selectedEventoId}
        onEventoChange={(id) => { setSelectedEventoId(id); setSearchNome(""); setSelectedIds([]); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-heading font-bold">Inscrições</h2>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedEventoId} onValueChange={(v) => { setSelectedEventoId(v); setSearchNome(""); setSelectedIds([]); setFiltroGenero(new Set(GENERO_OPTIONS)); setFiltroTipo(new Set(TIPO_OPTIONS)); }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecione um evento" />
            </SelectTrigger>
            <SelectContent>
              {eventos?.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {format(parseLocalDate(e.data_inicio), "dd/MM", { locale: ptBR })} — {e.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEventoId && inscricoes.length > 0 && (
            <>
              {/* Column selector for export */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 className="w-4 h-4 mr-2" />
                    Colunas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-3" align="end">
                  <p className="text-sm font-medium mb-2">Colunas visíveis</p>
                  <div className="space-y-2">
                    {ALL_COLUMNS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={isCol(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {selectedEventoId && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/financeiro?evento=${selectedEventoId}`)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Financeiro
            </Button>
          )}
          {selectedEventoId && (
            <Button onClick={handleNewInscricao}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Inscrição
            </Button>
          )}
          {selectedEventoId && inscricoes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setEmergenciaOpen(true)}>
              <ShieldAlert className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          )}
          {selectedEventoId && inscricoes.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setFinalizarOpen(true)}>
              <Archive className="w-4 h-4 mr-2" />
              Finalizar Evento
            </Button>
          )}
        </div>
      </div>

      {selectedEventoId && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchNome}
            onChange={(e) => setSearchNome(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchNome && (
            <button
              onClick={() => setSearchNome("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground self-center">
            {selectedIds.length} selecionado(s)
          </span>
          <Button size="sm" variant="outline" onClick={printCrachas}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Crachás
          </Button>
          <Button size="sm" variant="outline" onClick={printEtiquetas}>
            <Tag className="w-4 h-4 mr-2" />
            Etiquetas de Mala
          </Button>
        </div>
      )}

      {!selectedEventoId ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione um evento para ver as inscrições.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <Table className="min-w-max">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={inscricoes.length > 0 && selectedIds.length === inscricoes.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  {isCol("referencia") && <TableHead>Ref.</TableHead>}
                  <TableHead></TableHead>
                  {isCol("nome") && <TableHead>Nome</TableHead>}
                  {isCol("tipo") && <TableHead><ColumnFilterPopover title="Tipo" options={TIPO_OPTIONS} selected={filtroTipo} onChange={setFiltroTipo} /></TableHead>}
                  {isCol("genero") && <TableHead><ColumnFilterPopover title="Gênero" options={GENERO_OPTIONS} selected={filtroGenero} onChange={setFiltroGenero} /></TableHead>}
                  {isCol("telefone") && <TableHead>Contato</TableHead>}
                  {isCol("local") && <TableHead>Casa Refúgio / Condomínio</TableHead>}
                  {isCol("forma_pagamento") && <TableHead>Forma Pagamento</TableHead>}
                  {isCol("valor_inscricao") && <TableHead>Valor Inscrição</TableHead>}
                  {isCol("a_pagar") && <TableHead>A Pagar</TableHead>}
                  {isCol("valor_pago") && <TableHead>Valor Pago</TableHead>}
                  {isCol("status") && <TableHead>Status</TableHead>}
                  {isCol("contato_emergencia") && <TableHead>Contato Emergência</TableHead>}
                  {isCol("telefone_emergencia") && <TableHead>Tel. Emergência</TableHead>}
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscricoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.size + 3} className="py-8 text-center text-muted-foreground">
                      <div className="space-y-3">
                        <p>{(rawImpactoInscricoes?.length || 0) + (rawAgendaInscricoes?.length || 0) > 0
                          ? "Nenhuma inscrição encontrada com os filtros atuais."
                          : "Nenhuma inscrição registrada para este evento."}</p>
                        {((rawImpactoInscricoes?.length || 0) + (rawAgendaInscricoes?.length || 0) > 0) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFiltroGenero(new Set(GENERO_OPTIONS));
                              setFiltroTipo(new Set(TIPO_OPTIONS));
                              setSearchNome("");
                            }}
                          >
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  inscricoes.map((inscricao) => {
                    const valorPago = getValorPago(inscricao);
                    const valorInscricao = getValorInscricaoEvento(inscricao);
                    const aPagar = valorInscricao != null
                      ? Math.max(0, valorInscricao - valorPago)
                      : null;
                    return (
                      <TableRow key={inscricao.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(inscricao.id)}
                            onCheckedChange={(checked) => handleSelect(inscricao.id, !!checked)}
                          />
                        </TableCell>
                        {isCol("referencia") && <TableCell className="text-xs font-mono text-muted-foreground">{inscricao.referencia || "—"}</TableCell>}
                        <TableCell>
                          {inscricao.member?.photo_url ? (
                            <img src={inscricao.member.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                              {(inscricao.nome || "?")[0]?.toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        {isCol("nome") && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {inscricao.nome}
                              <button
                                title={inscricao.aprovado ? "Aprovado" : "Clique para aprovar"}
                                onClick={async () => {
                                  if (inscricao.aprovado) return;
                                  const { error } = await supabase
                                    .from("impacto_inscricoes")
                                    .update({ aprovado: true } as any)
                                    .eq("id", inscricao.id);
                                  if (error) {
                                    toast.error("Erro ao aprovar inscrição");
                                  } else {
                                    toast.success(`Inscrição de ${inscricao.nome} aprovada!`);
                                    queryClient.invalidateQueries({ queryKey: ["impacto-inscricoes", selectedEventoId] });
                                  }
                                }}
                                className={`flex-shrink-0 ${inscricao.aprovado ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
                              >
                                <CheckCircle className={`w-4 h-4 ${inscricao.aprovado ? "text-muted-foreground/40" : "text-green-500"}`} />
                              </button>
                            </div>
                          </TableCell>
                        )}
                        {isCol("tipo") && (
                          <TableCell className="text-sm">
                            {TIPOS_INSCRICAO_LABELS[inscricao.tipo_inscricao] || "Membro"}
                          </TableCell>
                        )}
                        {isCol("genero") && (
                          <TableCell className="text-sm">
                            {resolveGeneroLabel(inscricao)}
                          </TableCell>
                        )}
                        {isCol("telefone") && <TableCell>{getPhone(inscricao)}</TableCell>}
                        {isCol("local") && <TableCell>{getLocationLabel(inscricao)}</TableCell>}
                        {isCol("forma_pagamento") && (
                          <TableCell>{inscricao.forma_pagamento ? (FORMAS_PAGAMENTO_LABELS[inscricao.forma_pagamento] || inscricao.forma_pagamento) : "—"}</TableCell>
                        )}
                        {isCol("valor_inscricao") && (
                          <TableCell className="text-sm">
                            {valorInscricao != null ? formatCurrency(valorInscricao) : "—"}
                          </TableCell>
                        )}
                        {isCol("a_pagar") && (
                          <TableCell className="text-sm font-medium">
                            {aPagar != null
                              ? aPagar > 0
                                ? <span className="text-destructive">{formatCurrency(aPagar)}</span>
                                : <span className="text-primary">Quitado</span>
                              : "—"}
                          </TableCell>
                        )}
                        {isCol("valor_pago") && (
                          <TableCell className="text-sm">
                            {valorPago > 0 ? formatCurrency(valorPago) : "—"}
                          </TableCell>
                        )}
                        {isCol("status") && <TableCell>{getStatusBadge(inscricao.status_pagamento)}</TableCell>}
                        {isCol("contato_emergencia") && (
                          <TableCell className="text-sm">{inscricao.nome_responsavel || "—"}</TableCell>
                        )}
                        {isCol("telefone_emergencia") && (
                          <TableCell className="text-sm">
                            {(inscricao.telefone_emergencia || inscricao.telefone_responsavel)
                              ? formatPhone(inscricao.telefone_emergencia || inscricao.telefone_responsavel)
                              : "—"}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(inscricao)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingInscricao({ id: inscricao.id, source: inscricao.source, nome: inscricao.nome, member_id: inscricao.member_id, evento_id: inscricao.evento_id })}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedEventoId && (
        <ImpactoInscricaoFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingInscricao(null);
          }}
          eventoId={selectedEventoId}
          inscricao={editingInscricao}
        />
      )}

      <ConfirmDialog
        open={!!deletingInscricao}
        onOpenChange={(open) => !open && setDeletingInscricao(null)}
        onConfirm={() => {
          if (deletingInscricao) {
            deleteMutation.mutate({
              id: deletingInscricao.id,
              source: deletingInscricao.source,
              member_id: deletingInscricao.member_id,
              nome: deletingInscricao.nome,
              evento_id: deletingInscricao.evento_id,
            });
            setDeletingInscricao(null);
          }
        }}
        title="Excluir inscrição?"
        description={`Deseja excluir a inscrição de "${deletingInscricao?.nome || ""}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />

      {selectedEventoId && (
        <FinalizarEventoDialog
          open={finalizarOpen}
          onOpenChange={setFinalizarOpen}
          eventoId={selectedEventoId}
          eventoNome={eventos?.find((e) => e.id === selectedEventoId)?.titulo || ""}
        />
      )}

      {selectedEventoId && (
        <EnvioEmergenciaDialog
          open={emergenciaOpen}
          onOpenChange={setEmergenciaOpen}
          eventoId={selectedEventoId}
          eventoTipo={selectedEventoSource === "agenda" ? "agenda" : "impacto"}
          eventoTitulo={eventos?.find((e) => e.id === selectedEventoId)?.titulo || ""}
        />
      )}
    </div>
  );
};

export default ImpactoInscricoesTab;
