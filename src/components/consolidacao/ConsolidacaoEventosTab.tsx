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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { includesNormalized } from "@/lib/text-utils";
import { formatEventoPeriodo, parseLocalDate } from "@/lib/date-utils";
import { exportRowsToExcel, exportRowsToPDF } from "@/lib/export";
import { ConverterMembroDialog, type InscricaoConsolidacao } from "./ConverterMembroDialog";
import { NovoConvertidoFormDialog } from "./NovoConvertidoFormDialog";

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
           evento:impacto_eventos!inner(id, titulo, data_inicio, data_fim, finalizado)`
        )
        .eq(flagField, true)
        .eq("virou_membro", false)
        .eq("evento.finalizado", true)
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
    const eventoRows: UnifiedRow[] = inscricoes.map((i) => ({
      id: i.id,
      source: "evento",
      nome: i.nome || "—",
      origem: i.evento
        ? `${i.evento.titulo} — ${formatEventoPeriodo(i.evento.data_inicio, i.evento.data_fim)}`
        : "—",
      telefone: i.telefone || "—",
      email: i.email || "—",
      genero: resolveGenero(i.genero),
      nascimento: i.data_nascimento
        ? parseLocalDate(i.data_nascimento).toLocaleDateString("pt-BR")
        : "—",
      data_nascimento: i.data_nascimento,
      raw: i,
    }));

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
  const titulo = tipo === "conversao" ? "Convertidos em Eventos" : "Reconciliações";

  const whatsappHref = (telefone?: string | null) => {
    const num = onlyDigits(telefone);
    if (!num) return null;
    const full = num.startsWith("55") ? num : `55${num}`;
    return `https://wa.me/${full}`;
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
            Pessoas marcadas como {tipo === "conversao" ? "conversão" : "reconciliação"} nos eventos finalizados
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
                            asChild
                            size="icon"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700"
                            title="Enviar WhatsApp"
                          >
                            <a href={whatsappHref(r.telefone)!} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-4 h-4" />
                            </a>
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
