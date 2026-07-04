import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { ColumnFilterPopover } from "@/components/ui/column-filter-popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send } from "lucide-react";
import {
  Loader2,
  MessageCircle,
  Mail,
  UserRoundCheck,
  HeartHandshake,
  Heart,
  UserPlus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { includesNormalized } from "@/lib/text-utils";
import { formatEventoPeriodo, parseLocalDate } from "@/lib/date-utils";
import { exportRowsToExcel, exportRowsToPDF } from "@/lib/export";
import { ConverterMembroDialog, type InscricaoConsolidacao } from "./ConverterMembroDialog";
import { NovoConvertidoFormDialog } from "./NovoConvertidoFormDialog";
import WhatsappAnexoUpload, { type WhatsappAnexo } from "@/components/whatsapp/WhatsappAnexoUpload";

interface ConsolidacaoEventosTabProps {
  tipo: "conversao" | "reconciliacao";
  /** Include manual records from novos_convertidos with the matching tipo_conversao. */
  includeManual?: boolean;
  /** Hide the title/description header (useful when embedded in a page that already has context). */
  hideTitle?: boolean;
}

const comoChegouLabels: Record<string, string> = {
  culto_domingo: "Culto Domingo",
  culto_quarta: "Culto Quarta",
  casa_refugio: "Casa Refúgio",
  impacto: "Impacto",
  acao_evangelistica: "Ação Evangelística",
};

const resolveGenero = (g?: string | null) => {
  const lower = (g || "").toLowerCase();
  if (lower === "m" || lower === "masculino") return "Masculino";
  if (lower === "f" || lower === "feminino") return "Feminino";
  return "—";
};

const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");

// Modelos de mensagem prontos (com {nome} substituído pelo primeiro nome).
const MODELOS_MENSAGEM: Record<"conversao" | "reconciliacao", { label: string; texto: string }[]> = {
  conversao: [
    {
      label: "Boas-vindas à família",
      texto:
        "Olá {nome}! 🙏\n\nQue alegria ter você na família de Deus! Sua decisão de entregar a vida a Jesus é o início de uma linda caminhada.\n\nEstamos aqui para te acompanhar de perto. Conte conosco sempre!\n\nCom carinho,\nIgreja Gileade 💙",
    },
    {
      label: "Convite para o próximo culto",
      texto:
        "Oi {nome}! 😊\n\nFoi uma bênção ter você conosco! Queremos te convidar para o nosso próximo culto e continuar essa caminhada juntos.\n\nVocê tem um lugar especial aqui!\n\nIgreja Gileade 💙",
    },
    {
      label: "Acompanhamento / discipulado",
      texto:
        "Olá {nome}! 🙏\n\nEstamos muito felizes com a sua decisão por Jesus! Gostaríamos de te acompanhar nessa nova fase através do nosso discipulado.\n\nPodemos conversar sobre isso?\n\nIgreja Gileade 💙",
    },
  ],
  reconciliacao: [
    {
      label: "Bem-vindo de volta",
      texto:
        "Olá {nome}! 🙏\n\nQue alegria imensa ter você de volta à casa do Pai! Sua reconciliação é uma grande festa no céu.\n\nEstamos aqui para caminhar com você nessa nova fase. Conte conosco sempre!\n\nCom carinho,\nIgreja Gileade 💙",
    },
    {
      label: "Convite para o próximo culto",
      texto:
        "Oi {nome}! 😊\n\nQue bom ter você de volta! Queremos te convidar para o nosso próximo culto e seguir juntos nessa caminhada.\n\nVocê é muito especial para nós!\n\nIgreja Gileade 💙",
    },
    {
      label: "Acompanhamento / discipulado",
      texto:
        "Olá {nome}! 🙏\n\nFicamos muito felizes com a sua reconciliação! Gostaríamos de te acompanhar de perto através do nosso discipulado.\n\nPodemos conversar sobre isso?\n\nIgreja Gileade 💙",
    },
  ],
};

interface UnifiedRow {
  id: string;
  source: "evento" | "manual";
  nome: string;
  origem: string;
  telefone: string;
  email: string;
  genero: string;
  nascimento: string;
  data_nascimento?: string | null;
  raw: any;
}

export const ConsolidacaoEventosTab = ({ tipo, includeManual = false, hideTitle = false }: ConsolidacaoEventosTabProps) => {
  const flagField = tipo === "conversao" ? "converteu" : "reconciliou";
  const eventosKey = `consolidacao-${tipo}-eventos`;
  const manualKey = `consolidacao-${tipo}-manual`;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [converting, setConverting] = useState<InscricaoConsolidacao | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [impactoLink, setImpactoLink] = useState<{
    id: string;
    defaults: NonNullable<Parameters<typeof NovoConvertidoFormDialog>[0]["impactoDefaults"]>;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [whatsRecipients, setWhatsRecipients] = useState<{ nome: string; telefone: string }[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null);
  const [whatsMsg, setWhatsMsg] = useState("");
  const [whatsAnexo, setWhatsAnexo] = useState<WhatsappAnexo | null>(null);
  const [sendingWhats, setSendingWhats] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);

  // Column filters
  const [fNome, setFNome] = useState<Set<string>>(new Set());
  const [fOrigem, setFOrigem] = useState<Set<string>>(new Set());
  const [fTelefone, setFTelefone] = useState<Set<string>>(new Set());
  const [fEmail, setFEmail] = useState<Set<string>>(new Set());
  const [fGenero, setFGenero] = useState<Set<string>>(new Set());
  const [fNasc, setFNasc] = useState<Set<string>>(new Set());

  const { data: inscricoes = [], isLoading: loadingEventos } = useQuery({
    queryKey: [eventosKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("impacto_inscricoes")
        .select(
          `id, member_id, nome, telefone, email, genero, data_nascimento, observacoes,
           tipo_inscricao, status_pagamento, virou_membro,
           evento:impacto_eventos!inner(id, titulo, data_inicio, data_fim, finalizado),
           member:members!impacto_inscricoes_member_id_fkey(id, birth_date)`
        )
        .eq(flagField, true)
        .eq("virou_membro", false)
        .order("nome");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: manuais = [], isLoading: loadingManuais } = useQuery({
    queryKey: [manualKey],
    enabled: includeManual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("novos_convertidos")
        .select("*")
        .eq("tipo_conversao", tipo)
        .eq("tornou_membro", false)
        .is("impacto_inscricao_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const isLoading = loadingEventos || (includeManual && loadingManuais);

  const rows = useMemo<UnifiedRow[]>(() => {
    const eventoRows: UnifiedRow[] = inscricoes.map((i) => {
      const nasc = i.data_nascimento || i.member?.birth_date || null;
      return {
      id: i.id,
      source: "evento",
      nome: i.nome || "—",
      origem: i.evento
        ? `${i.evento.titulo} — ${formatEventoPeriodo(i.evento.data_inicio, i.evento.data_fim)}`
        : "—",
      telefone: i.telefone || "—",
      email: i.email || "—",
      genero: resolveGenero(i.genero),
      nascimento: nasc
        ? parseLocalDate(nasc).toLocaleDateString("pt-BR")
        : "—",
      data_nascimento: nasc,
      raw: i,
      };
    });

    const manualRows: UnifiedRow[] = (includeManual ? manuais : []).map((m) => ({
      id: m.id,
      source: "manual",
      nome: m.full_name || "—",
      origem: m.como_chegou ? comoChegouLabels[m.como_chegou] || m.como_chegou : "Cadastro Manual",
      telefone: m.whatsapp || "—",
      email: m.email || "—",
      genero: resolveGenero(m.genero),
      nascimento: m.data_nascimento
        ? parseLocalDate(m.data_nascimento).toLocaleDateString("pt-BR")
        : "—",
      data_nascimento: m.data_nascimento,
      raw: m,
    }));

    return [...manualRows, ...eventoRows];
  }, [inscricoes, manuais, includeManual]);

  const columnOptions = useMemo(() => {
    const uniq = (vals: string[]) => Array.from(new Set(vals)).sort();
    return {
      nome: uniq(rows.map((r) => r.nome)),
      origem: uniq(rows.map((r) => r.origem)),
      telefone: uniq(rows.map((r) => r.telefone)),
      email: uniq(rows.map((r) => r.email)),
      genero: uniq(rows.map((r) => r.genero)),
      nasc: uniq(rows.map((r) => r.nascimento)),
    };
  }, [rows]);

  useEffect(() => {
    if (fNome.size === 0 && columnOptions.nome.length > 0) setFNome(new Set(columnOptions.nome));
    if (fOrigem.size === 0 && columnOptions.origem.length > 0) setFOrigem(new Set(columnOptions.origem));
    if (fTelefone.size === 0 && columnOptions.telefone.length > 0) setFTelefone(new Set(columnOptions.telefone));
    if (fEmail.size === 0 && columnOptions.email.length > 0) setFEmail(new Set(columnOptions.email));
    if (fGenero.size === 0 && columnOptions.genero.length > 0) setFGenero(new Set(columnOptions.genero));
    if (fNasc.size === 0 && columnOptions.nasc.length > 0) setFNasc(new Set(columnOptions.nasc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnOptions]);

  const filtradas = useMemo(() => {
    return rows.filter((r) => {
      if (search && !includesNormalized(r.nome, search)) return false;
      if (fNome.size < columnOptions.nome.length && !fNome.has(r.nome)) return false;
      if (fOrigem.size < columnOptions.origem.length && !fOrigem.has(r.origem)) return false;
      if (fTelefone.size < columnOptions.telefone.length && !fTelefone.has(r.telefone)) return false;
      if (fEmail.size < columnOptions.email.length && !fEmail.has(r.email)) return false;
      if (fGenero.size < columnOptions.genero.length && !fGenero.has(r.genero)) return false;
      if (fNasc.size < columnOptions.nasc.length && !fNasc.has(r.nascimento)) return false;
      return true;
    });
  }, [rows, search, fNome, fOrigem, fTelefone, fEmail, fGenero, fNasc, columnOptions]);

  const Icone = tipo === "conversao" ? Heart : HeartHandshake;
  const titulo = tipo === "conversao" ? "Novos Convertidos" : "Reconciliações";

  const whatsappHref = (telefone?: string | null) => {
    const num = onlyDigits(telefone);
    if (!num) return null;
    const full = num.startsWith("55") ? num : `55${num}`;
    return `https://wa.me/${full}`;
  };

  const openWhats = (nome: string, telefone?: string | null) => {
    const num = onlyDigits(telefone);
    if (!num) return;
    const full = num.startsWith("55") ? num : `55${num}`;
    const primeiroNome = (nome || "").split(" ")[0] || "";
    setWhatsRecipients([{ nome, telefone: full }]);
    setWhatsMsg(`Olá ${primeiroNome}, tudo bem? Aqui é da Igreja Gileade. `);
  };

  const rowKey = (r: UnifiedRow) => `${r.source}-${r.id}`;

  const toggleSelect = (key: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const openWhatsBulk = () => {
    const recips = filtradas
      .filter((r) => selectedIds.has(rowKey(r)))
      .map((r) => {
        const num = onlyDigits(r.telefone);
        if (!num) return null;
        const full = num.startsWith("55") ? num : `55${num}`;
        return { nome: r.nome, telefone: full };
      })
      .filter(Boolean) as { nome: string; telefone: string }[];
    if (recips.length === 0) {
      toast({ variant: "destructive", title: "Nenhum selecionado com telefone válido" });
      return;
    }
    setWhatsRecipients(recips);
    setWhatsMsg("Olá {nome}, tudo bem? Aqui é da Igreja Gileade. ");
  };

  const aplicarModelo = (texto: string) => {
    if (whatsRecipients && whatsRecipients.length === 1) {
      const primeiroNome = (whatsRecipients[0].nome || "").split(" ")[0] || "";
      setWhatsMsg(texto.replace(/\{nome\}/gi, primeiroNome));
    } else {
      setWhatsMsg(texto);
    }
  };

  const gerarMensagemIA = async () => {
    if (!whatsRecipients || whatsRecipients.length === 0) return;
    setGerandoIA(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-mensagem-consolidacao", {
        body: { nome: whatsRecipients.length === 1 ? whatsRecipients[0].nome : "{nome}", tipo },
      });
      if (error) throw error;
      if (data?.mensagem) {
        setWhatsMsg(data.mensagem);
        toast({ title: "Mensagem gerada!", description: "Criada com IA. Você pode editá-la antes de enviar." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao gerar mensagem", description: err.message });
    } finally {
      setGerandoIA(false);
    }
  };

  const enviarWhats = async () => {
    if (!whatsRecipients || whatsRecipients.length === 0 || !whatsMsg.trim()) return;
    const recipients = whatsRecipients;
    setSendingWhats(true);
    let enviados = 0;
    let falhas = 0;
    try {
      for (let idx = 0; idx < recipients.length; idx++) {
        const r = recipients[idx];
        const primeiroNome = (r.nome || "").split(" ")[0] || "";
        const msgFinal = whatsMsg.replace(/\{nome\}/gi, primeiroNome).trim();
        try {
          const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
            body: { action: "mensagem_direta", telefone: r.telefone, mensagem: msgFinal, midiaUrl: whatsAnexo?.url || null, midiaFileName: whatsAnexo?.fileName || null },
          });
          if (error) throw error;
          if (data && data.success === false) throw new Error(data.error || "Falha no envio");
          enviados++;
        } catch {
          falhas++;
        }
        setSendProgress({ done: idx + 1, total: recipients.length });
        // Delay anti-SPAM aleatório entre mensagens (não após a última)
        if (recipients.length > 1 && idx < recipients.length - 1) {
          const delay = Math.floor(Math.random() * 15000) + 15000;
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      toast({
        title: "Envio concluído",
        description: `${enviados} enviada(s)${falhas ? `, ${falhas} falha(s)` : ""}.`,
      });
      setWhatsRecipients(null);
      setWhatsMsg("");
      setWhatsAnexo(null);
      setSelectedIds(new Set());
    } finally {
      setSendingWhats(false);
      setSendProgress(null);
    }
  };

  const exportHeaders = ["Nome", "Origem", "Telefone", "E-mail", "Gênero", "Nascimento"];
  const exportData = () =>
    filtradas.map((r) => ({
      Nome: r.nome,
      Origem: r.origem,
      Telefone: r.telefone === "—" ? "" : r.telefone,
      "E-mail": r.email === "—" ? "" : r.email,
      Gênero: r.genero === "—" ? "" : r.genero,
      Nascimento: r.nascimento === "—" ? "" : r.nascimento,
    }));

  const handleExcel = async () => {
    if (filtradas.length === 0) {
      toast({ variant: "destructive", title: "Nenhum registro para exportar" });
      return;
    }
    await exportRowsToExcel(exportData(), exportHeaders, titulo, `consolidacao-${tipo}`);
  };

  const handlePDF = () => {
    if (filtradas.length === 0) {
      toast({ variant: "destructive", title: "Nenhum registro para exportar" });
      return;
    }
    exportRowsToPDF(exportData(), exportHeaders, titulo, `consolidacao-${tipo}`);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("novos_convertidos").delete().eq("id", deletingId);
      if (error) throw error;
      toast({ title: "Registro excluído com sucesso" });
      queryClient.invalidateQueries({ queryKey: [manualKey] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const toInscricao = (r: UnifiedRow): InscricaoConsolidacao => ({
    id: r.id,
    nome: r.nome === "—" ? "" : r.nome,
    telefone: r.telefone === "—" ? "" : r.telefone,
    email: r.email === "—" ? "" : r.email,
    genero: r.raw.genero,
    data_nascimento: r.data_nascimento,
    source: r.source,
  });

  const openManualEdit = (raw: any) => {
    setImpactoLink(null);
    setEditing(raw);
    setShowForm(true);
  };

  const openEventEdit = async (r: UnifiedRow) => {
    const defaults = {
      full_name: r.raw.nome || "",
      whatsapp: r.raw.telefone || "",
      email: r.raw.email || "",
      genero: r.raw.genero || "",
      data_nascimento: r.data_nascimento || "",
    };
    // Load any existing "Trilho em Gileade" record already linked to this inscription.
    const { data } = await supabase
      .from("novos_convertidos")
      .select("*")
      .eq("impacto_inscricao_id", r.id)
      .maybeSingle();
    setEditing((data as any) || null);
    setImpactoLink({ id: r.id, defaults });
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Icone className="w-5 h-5 text-destructive" />
            <h2 className="font-heading font-bold text-xl">{titulo}</h2>
            <Badge variant="secondary">{filtradas.length}</Badge>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handlePDF}>
                <FileText className="w-4 h-4 mr-2" /> PDF
              </Button>
              {includeManual && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setImpactoLink(null);
                    setShowForm(true);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Novo
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Pessoas marcadas como {tipo === "conversao" ? "conversão" : "reconciliação"} nos eventos
            {includeManual ? " e cadastros manuais." : "."}
          </p>
        </>
      )}

      {hideTitle && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDF}>
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
            {includeManual && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setImpactoLink(null);
                  setShowForm(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" /> Novo
              </Button>
            )}
          </div>
        </div>
      )}

      <SearchInput placeholder="Buscar por nome..." value={search} onChange={setSearch} className="w-full sm:max-w-sm" />

      {(() => {
        const selCount = filtradas.filter((r) => selectedIds.has(rowKey(r))).length;
        if (selCount === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">{selCount} selecionado(s)</span>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={openWhatsBulk}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar WhatsApp
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
          </div>
        );
      })()}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-destructive animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum registro encontrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {(() => {
                      const selectableKeys = filtradas
                        .filter((r) => onlyDigits(r.telefone))
                        .map(rowKey);
                      const allSelected =
                        selectableKeys.length > 0 &&
                        selectableKeys.every((k) => selectedIds.has(k));
                      return (
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(c) =>
                            setSelectedIds(c ? new Set(selectableKeys) : new Set())
                          }
                          aria-label="Selecionar todos"
                        />
                      );
                    })()}
                  </TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Nome" options={columnOptions.nome} selected={fNome} onChange={setFNome} />
                  </TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Origem" options={columnOptions.origem} selected={fOrigem} onChange={setFOrigem} />
                  </TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Telefone" options={columnOptions.telefone} selected={fTelefone} onChange={setFTelefone} />
                  </TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="E-mail" options={columnOptions.email} selected={fEmail} onChange={setFEmail} />
                  </TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Gênero" options={columnOptions.genero} selected={fGenero} onChange={setFGenero} />
                  </TableHead>
                  <TableHead>
                    <ColumnFilterPopover title="Nascimento" options={columnOptions.nasc} selected={fNasc} onChange={setFNasc} />
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((r) => (
                  <TableRow key={`${r.source}-${r.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(rowKey(r))}
                        disabled={!onlyDigits(r.telefone)}
                        onCheckedChange={(c) => toggleSelect(rowKey(r), !!c)}
                        aria-label={`Selecionar ${r.nome}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.nome}
                      {r.source === "manual" && (
                        <Badge variant="outline" className="ml-2 text-[10px]">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.origem}</TableCell>
                    <TableCell>{r.telefone}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.email}</TableCell>
                    <TableCell>{r.genero}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.nascimento}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {whatsappHref(r.telefone) ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                            title="Enviar WhatsApp"
                            onClick={() => openWhats(r.nome, r.telefone)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="text-green-600" disabled title="Sem telefone">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {r.email !== "—" ? (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="text-blue-600 hover:text-blue-700"
                            title="Enviar e-mail"
                          >
                            <a href={`mailto:${r.email}`}>
                              <Mail className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button size="icon" variant="ghost" className="text-blue-600" disabled title="Sem e-mail">
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Editar"
                          onClick={() =>
                            r.source === "manual" ? openManualEdit(r.raw) : openEventEdit(r)
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {r.source === "manual" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                            onClick={() => setDeletingId(r.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          title="Converter para Membro"
                          onClick={() => setConverting(toInscricao(r))}
                        >
                          <UserRoundCheck className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConverterMembroDialog
        open={!!converting}
        onOpenChange={(o) => !o && setConverting(null)}
        inscricao={converting}
        invalidateKeys={[eventosKey, manualKey]}
      />

      <Dialog open={!!whatsRecipients} onOpenChange={(o) => { if (!o && !sendingWhats) { setWhatsRecipients(null); setWhatsMsg(""); setWhatsAnexo(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {whatsRecipients && whatsRecipients.length > 1
                ? `Enviar WhatsApp para ${whatsRecipients.length} pessoas`
                : `Enviar WhatsApp ${whatsRecipients?.[0] ? `para ${whatsRecipients[0].nome}` : ""}`}
            </DialogTitle>
          </DialogHeader>
          {whatsRecipients && whatsRecipients.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Use <code className="font-mono">{"{nome}"}</code> na mensagem para inserir o primeiro nome de cada pessoa automaticamente.
            </p>
          )}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Select onValueChange={aplicarModelo}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Escolher um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_MENSAGEM[tipo].map((m) => (
                    <SelectItem key={m.label} value={m.texto}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={gerarMensagemIA}
                disabled={gerandoIA}
                className="shrink-0"
              >
                {gerandoIA ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar com IA
              </Button>
            </div>
            <Textarea
              value={whatsMsg}
              onChange={(e) => setWhatsMsg(e.target.value)}
              rows={6}
              placeholder="Escolha um modelo, gere com IA ou digite a mensagem..."
            />
            <WhatsappAnexoUpload value={whatsAnexo} onChange={setWhatsAnexo} disabled={sendingWhats} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWhatsRecipients(null); setWhatsMsg(""); setWhatsAnexo(null); }} disabled={sendingWhats}>
              Cancelar
            </Button>
            <Button onClick={enviarWhats} disabled={sendingWhats || !whatsMsg.trim()} className="bg-green-600 hover:bg-green-700">
              {sendingWhats ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {sendingWhats && sendProgress
                ? `Enviando ${sendProgress.done}/${sendProgress.total}`
                : whatsRecipients && whatsRecipients.length > 1
                ? `Enviar (${whatsRecipients.length})`
                : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoConvertidoFormDialog
        open={showForm}
        onOpenChange={(o) => {
          setShowForm(o);
          if (!o) {
            setEditing(null);
            setImpactoLink(null);
          }
        }}
        convertido={editing}
        tipoConversaoDefault={tipo}
        impactoInscricaoId={impactoLink?.id}
        impactoDefaults={impactoLink?.defaults}
      />

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
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
    </div>
  );
};
