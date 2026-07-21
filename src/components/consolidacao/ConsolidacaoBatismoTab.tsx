import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  MessageCircle,
  Mail,
  Send,
  FileSpreadsheet,
  FileText,
  Award,
  Droplets,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { includesNormalized } from "@/lib/text-utils";
import { parseLocalDate, formatEventoPeriodo } from "@/lib/date-utils";
import { exportRowsToExcel, exportRowsToPDF } from "@/lib/export";
import BatismoCertificadoDialog from "./BatismoCertificadoDialog";
import WhatsappAnexoUpload, { type WhatsappAnexo } from "@/components/whatsapp/WhatsappAnexoUpload";

const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");

const resolveGenero = (g?: string | null) => {
  const lower = (g || "").toLowerCase();
  if (lower === "m" || lower === "masculino") return "Masculino";
  if (lower === "f" || lower === "feminino") return "Feminino";
  return "—";
};

interface Row {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  genero: string;
  nascimento: string;
  data_batismo: string | null;
  raw: any;
}

export const ConsolidacaoBatismoTab = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [whatsRecipients, setWhatsRecipients] = useState<{ nome: string; telefone: string }[] | null>(null);
  const [whatsMsg, setWhatsMsg] = useState("");
  const [whatsAnexo, setWhatsAnexo] = useState<WhatsappAnexo | null>(null);
  const [sendingWhats, setSendingWhats] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ done: number; total: number } | null>(null);
  const [certificadoOpen, setCertificadoOpen] = useState<Row | null>(null);

  // Column filters
  const [fNome, setFNome] = useState<Set<string>>(new Set());
  const [fTelefone, setFTelefone] = useState<Set<string>>(new Set());
  const [fEmail, setFEmail] = useState<Set<string>>(new Set());
  const [fGenero, setFGenero] = useState<Set<string>>(new Set());
  const [fNasc, setFNasc] = useState<Set<string>>(new Set());

  // Próximo evento de batismo: o próximo (>= hoje) ou o mais recente se não houver futuro
  const { data: evento, isLoading: loadingEvento } = useQuery({
    queryKey: ["consolidacao-proximo-batismo"],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: prox } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, hora_inicio")
        .eq("tipo_evento", "batismo")
        .ilike("titulo", "%batis%")
        .eq("ativo", true)
        .gte("data_evento", hoje)
        .order("data_evento", { ascending: true })
        .limit(1);
      if (prox && prox.length > 0) return prox[0];
      const { data: past } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, hora_inicio")
        .eq("tipo_evento", "batismo")
        .ilike("titulo", "%batis%")
        .eq("ativo", true)
        .order("data_evento", { ascending: false })
        .limit(1);
      return past?.[0] || null;
    },
  });

  const { data: inscricoes = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ["consolidacao-batismo-inscricoes", evento?.id],
    enabled: !!evento?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_eventos")
        .select(
          `id, nome_participante, telefone_contato, genero, data_nascimento,
           status_pagamento, member_id,
           member:members!inscricoes_eventos_member_id_fkey(email, birth_date)`
        )
        .eq("evento_id", evento!.id)
        .neq("status_pagamento", "cancelado")
        .order("nome_participante");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const isLoading = loadingEvento || loadingInscricoes;

  const rows = useMemo<Row[]>(() => {
    return inscricoes.map((i) => {
      const nasc = i.data_nascimento || i.member?.birth_date || null;
      return {
        id: i.id,
        nome: i.nome_participante || "—",
        telefone: i.telefone_contato || "—",
        email: i.member?.email || "—",
        genero: resolveGenero(i.genero),
        nascimento: nasc ? parseLocalDate(nasc).toLocaleDateString("pt-BR") : "—",
        data_batismo: evento?.data_evento || null,
        raw: i,
      };
    });
  }, [inscricoes, evento]);

  const columnOptions = useMemo(() => {
    const uniq = (vals: string[]) => Array.from(new Set(vals)).sort();
    return {
      nome: uniq(rows.map((r) => r.nome)),
      telefone: uniq(rows.map((r) => r.telefone)),
      email: uniq(rows.map((r) => r.email)),
      genero: uniq(rows.map((r) => r.genero)),
      nasc: uniq(rows.map((r) => r.nascimento)),
    };
  }, [rows]);

  useEffect(() => {
    if (fNome.size === 0 && columnOptions.nome.length > 0) setFNome(new Set(columnOptions.nome));
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
      if (fTelefone.size < columnOptions.telefone.length && !fTelefone.has(r.telefone)) return false;
      if (fEmail.size < columnOptions.email.length && !fEmail.has(r.email)) return false;
      if (fGenero.size < columnOptions.genero.length && !fGenero.has(r.genero)) return false;
      if (fNasc.size < columnOptions.nasc.length && !fNasc.has(r.nascimento)) return false;
      return true;
    });
  }, [rows, search, fNome, fTelefone, fEmail, fGenero, fNasc, columnOptions]);

  const openWhats = (nome: string, telefone?: string | null) => {
    const num = onlyDigits(telefone);
    if (!num) return;
    const full = num.startsWith("55") ? num : `55${num}`;
    const primeiroNome = (nome || "").split(" ")[0] || "";
    setWhatsRecipients([{ nome, telefone: full }]);
    setWhatsMsg(`Olá ${primeiroNome}, tudo bem? Aqui é da Igreja Gileade. `);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const openWhatsBulk = () => {
    const recips = filtradas
      .filter((r) => selectedIds.has(r.id))
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
            body: {
              action: "mensagem_direta",
              telefone: r.telefone,
              mensagem: msgFinal,
              midiaUrl: whatsAnexo?.url || null,
              midiaFileName: whatsAnexo?.fileName || null,
            },
          });
          if (error) throw error;
          if (data && data.success === false) throw new Error(data.error || "Falha no envio");
          enviados++;
        } catch {
          falhas++;
        }
        setSendProgress({ done: idx + 1, total: recipients.length });
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

  const exportHeaders = ["Nome", "Telefone", "E-mail", "Gênero", "Nascimento"];
  const exportData = () =>
    filtradas.map((r) => ({
      Nome: r.nome,
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
    await exportRowsToExcel(exportData(), exportHeaders, "Batismo", "consolidacao-batismo");
  };

  const handlePDF = () => {
    if (filtradas.length === 0) {
      toast({ variant: "destructive", title: "Nenhum registro para exportar" });
      return;
    }
    exportRowsToPDF(exportData(), exportHeaders, "Batismo", "consolidacao-batismo");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Droplets className="w-5 h-5 text-cyan-600" />
        <h2 className="font-heading font-bold text-xl">Inscritos no Batismo</h2>
        <Badge variant="secondary">{filtradas.length}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePDF}>
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {evento ? (
        <div className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-lg text-sm">
          <Calendar className="w-4 h-4 text-cyan-600 shrink-0" />
          <div>
            <span className="font-semibold text-foreground">{evento.titulo}</span>
            <span className="text-muted-foreground ml-2">
              — {formatEventoPeriodo(evento.data_evento)}
              {evento.hora_inicio ? ` às ${evento.hora_inicio.substring(0, 5)}` : ""}
            </span>
          </div>
        </div>
      ) : !isLoading ? (
        <Card className="bg-muted/30">
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum evento de batismo cadastrado na agenda.
          </CardContent>
        </Card>
      ) : null}

      <SearchInput
        placeholder="Buscar por nome..."
        value={search}
        onChange={setSearch}
        className="w-full sm:max-w-sm"
      />

      {(() => {
        const selCount = filtradas.filter((r) => selectedIds.has(r.id)).length;
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
            Nenhum inscrito encontrado.
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
                        .map((r) => r.id);
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
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        disabled={!onlyDigits(r.telefone)}
                        onCheckedChange={(c) => toggleSelect(r.id, !!c)}
                        aria-label={`Selecionar ${r.nome}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{r.telefone}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.email}</TableCell>
                    <TableCell>{r.genero}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.nascimento}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {onlyDigits(r.telefone) ? (
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
                          className="text-cyan-600 hover:text-cyan-700"
                          title="Emitir Certificado"
                          onClick={() => setCertificadoOpen(r)}
                        >
                          <Award className="w-4 h-4" />
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

      <Dialog
        open={!!whatsRecipients}
        onOpenChange={(o) => {
          if (!o && !sendingWhats) {
            setWhatsRecipients(null);
            setWhatsMsg("");
            setWhatsAnexo(null);
          }
        }}
      >
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
              Use <code className="font-mono">{"{nome}"}</code> para inserir o primeiro nome de cada pessoa.
            </p>
          )}
          <div className="space-y-3">
            <Textarea
              value={whatsMsg}
              onChange={(e) => setWhatsMsg(e.target.value)}
              rows={6}
              placeholder="Digite a mensagem..."
            />
            <WhatsappAnexoUpload value={whatsAnexo} onChange={setWhatsAnexo} disabled={sendingWhats} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWhatsRecipients(null);
                setWhatsMsg("");
                setWhatsAnexo(null);
              }}
              disabled={sendingWhats}
            >
              Cancelar
            </Button>
            <Button
              onClick={enviarWhats}
              disabled={sendingWhats || !whatsMsg.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
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

      <BatismoCertificadoDialog
        open={!!certificadoOpen}
        onOpenChange={(o) => !o && setCertificadoOpen(null)}
        inscricao={
          certificadoOpen
            ? {
                id: certificadoOpen.id,
                nome: certificadoOpen.nome,
                data_batismo: certificadoOpen.data_batismo,
              }
            : null
        }
      />
    </div>
  );
};

export default ConsolidacaoBatismoTab;