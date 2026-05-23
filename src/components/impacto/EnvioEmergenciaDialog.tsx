import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Search, MessageCircle } from "lucide-react";
import { formatPhone } from "@/lib/masks";
import { Checkbox } from "@/components/ui/checkbox";
import WhatsappAnexoUpload, { type WhatsappAnexo } from "@/components/whatsapp/WhatsappAnexoUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIPO_LABELS: Record<string, string> = {
  confirmacao_inscricao: "Confirmação de inscrição",
  inscricao_recebida: "Inscrição recebida",
  lembrete_pagamento: "Lembrete de pagamento",
  vaga_liberada: "Vaga liberada",
  contato_emergencia: "Contato de emergência",
  aviso_importante: "Aviso importante",
  lembrete_evento: "Lembrete do evento",
  culto_batismo: "Culto de Batismo",
  apresentacao_criancas: "Apresentação de Crianças",
  ceia_senhor: "Ceia do Senhor",
  prestacao_contas: "Prestação de Contas",
  evento_especial: "Evento Especial",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eventoId: string;
  eventoTipo: "impacto" | "agenda";
  eventoTitulo: string;
  mensagemInicial?: string;
}

export default function EnvioEmergenciaDialog({
  open,
  onOpenChange,
  eventoId,
  eventoTipo,
  eventoTitulo,
  mensagemInicial,
}: Props) {
  const [destino, setDestino] = useState<"todos" | "um" | "selecionados">("todos");
  const [contatoTipo, setContatoTipo] = useState<"principal" | "emergencia">("principal");
  const [inscricaoId, setInscricaoId] = useState<string>("");
  const [inscricaoIds, setInscricaoIds] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [templateSel, setTemplateSel] = useState<string>("");
  const [tiposFiltro, setTiposFiltro] = useState<string[]>([]);
  const [statusEspiritualFiltro, setStatusEspiritualFiltro] = useState<string[]>([]);
  const [anexo, setAnexo] = useState<WhatsappAnexo | null>(null);
  // Evento de origem dos inscritos (pode diferir do evento da mensagem)
  const [inscritosEventoId, setInscritosEventoId] = useState<string>(eventoId);
  const [inscritosEventoTipo, setInscritosEventoTipo] =
    useState<"impacto" | "agenda">(eventoTipo);

  // Reset quando reabre com outro evento base
  useMemo(() => {
    if (open) {
      setInscritosEventoId(eventoId);
      setInscritosEventoTipo(eventoTipo);
    }
  }, [open, eventoId, eventoTipo]);

  // Lista de eventos disponíveis como origem (apenas eventos com inscrições)
  const { data: eventosOrigem = [] } = useQuery({
    queryKey: ["envio-eventos-origem"],
    queryFn: async () => {
      const [
        { data: imp },
        { data: ag },
        { data: impInscritos },
        { data: agInscritos },
      ] = await Promise.all([
        supabase
          .from("impacto_eventos")
          .select("id, titulo, data_inicio")
          .eq("ativo", true)
          .order("data_inicio", { ascending: false }),
        supabase
          .from("agenda_igreja")
          .select("id, titulo, data_evento")
          .eq("ativo", true)
          .order("data_evento", { ascending: false })
          .limit(100),
        supabase
          .from("impacto_inscricoes")
          .select("evento_id")
          .neq("status_pagamento", "cancelado"),
        supabase
          .from("inscricoes_eventos")
          .select("evento_id")
          .neq("status_pagamento", "cancelado"),
      ]);

      const impComInscritos = new Set((impInscritos || []).map((i: any) => i.evento_id));
      const agComInscritos = new Set((agInscritos || []).map((i: any) => i.evento_id));

      const a = (imp || [])
        .filter((e: any) => impComInscritos.has(e.id))
        .map((e: any) => ({
          id: e.id,
          tipo: "impacto" as const,
          titulo: e.titulo,
          data: e.data_inicio,
        }));
      const b = (ag || [])
        .filter((e: any) => agComInscritos.has(e.id))
        .map((e: any) => ({
          id: e.id,
          tipo: "agenda" as const,
          titulo: e.titulo,
          data: e.data_evento,
        }));
      return [...a, ...b];
    },
    enabled: open,
  });

  const { data: cfg } = useQuery({
    queryKey: ["emerg-cfg-dialog", eventoId, eventoTipo],
    queryFn: async () => {
      const { data } = await supabase
        .from("evento_emergencia_config")
        .select("mensagem_inicial")
        .eq("evento_id", eventoId)
        .eq("evento_tipo", eventoTipo)
        .maybeSingle();
      return data;
    },
    enabled: open && !!eventoId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["mensagens-templates-todos"],
    queryFn: async () => {
      // Lista TODOS os modelos salvos (de qualquer evento), exceto o de
      // contato de emergência. Inclui o título do evento de origem para
      // ajudar a identificar o modelo na lista.
      const { data: tpls } = await supabase
        .from("mensagens_evento_templates")
        .select("tipo_mensagem, mensagem, evento_id, evento_tipo, updated_at")
        .neq("tipo_mensagem", "contato_emergencia")
        .order("updated_at", { ascending: false });
      const lista = tpls || [];
      // Hidrata títulos dos eventos
      const impIds = Array.from(new Set(lista.filter((t) => t.evento_tipo === "impacto").map((t) => t.evento_id)));
      const agIds = Array.from(new Set(lista.filter((t) => t.evento_tipo === "agenda").map((t) => t.evento_id)));
      const [{ data: imps }, { data: ags }] = await Promise.all([
        impIds.length ? supabase.from("impacto_eventos").select("id, titulo").in("id", impIds) : Promise.resolve({ data: [] as any[] }),
        agIds.length ? supabase.from("agenda_igreja").select("id, titulo").in("id", agIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const titulos = new Map<string, string>();
      (imps || []).forEach((e: any) => titulos.set(e.id, e.titulo));
      (ags || []).forEach((e: any) => titulos.set(e.id, e.titulo));
      return lista.map((t: any) => ({
        ...t,
        evento_titulo: titulos.get(t.evento_id) || "—",
      }));
    },
    enabled: open,
  });

  useMemo(() => {
    if (open && cfg && !mensagem) setMensagem(cfg.mensagem_inicial || "");
  }, [cfg, open]);

  // Pré-preenche a mensagem ao abrir com modelo escolhido
  useMemo(() => {
    if (open && mensagemInicial) setMensagem(mensagemInicial);
  }, [open, mensagemInicial]);

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["emerg-dialog-inscricoes", inscritosEventoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("impacto_inscricoes")
        .select("id, nome, telefone, telefone_emergencia, telefone_responsavel, nome_responsavel, tipo_inscricao, converteu, reconciliou")
        .eq("evento_id", inscritosEventoId)
        .neq("status_pagamento", "cancelado")
        .order("nome");
      return data || [];
    },
    enabled: open && !!inscritosEventoId,
  });

  const inscricoesFiltradas = useMemo(() => {
    let list = inscricoes as any[];
    if (tiposFiltro.length > 0) {
      list = list.filter((i) => tiposFiltro.includes(i.tipo_inscricao));
    }
    if (statusEspiritualFiltro.length > 0) {
      list = list.filter((i) =>
        (statusEspiritualFiltro.includes("convertido") && i.converteu) ||
        (statusEspiritualFiltro.includes("reconciliado") && i.reconciliou)
      );
    }
    return list;
  }, [inscricoes, tiposFiltro, statusEspiritualFiltro]);

  const filtradas = useMemo(() => {
    if (!busca) return inscricoesFiltradas;
    const q = busca.toLowerCase();
    return (inscricoesFiltradas as any[]).filter(
      (i: any) =>
        i.nome?.toLowerCase().includes(q) ||
        i.nome_responsavel?.toLowerCase().includes(q),
    );
  }, [inscricoesFiltradas, busca]);

  const telefoneDe = (i: any) =>
    contatoTipo === "principal"
      ? i.telefone || ""
      : i.telefone_emergencia || i.telefone_responsavel || "";

  const totalComTelefone = (inscricoesFiltradas as any[]).filter(
    (i: any) => (telefoneDe(i) || "").replace(/\D/g, "").length >= 10,
  ).length;

  const handleEnviar = async () => {
    if (!mensagem.trim()) {
      toast.error("Digite a mensagem");
      return;
    }
    if (destino === "um" && !inscricaoId) {
      toast.error("Selecione um participante");
      return;
    }
    if (destino === "selecionados" && inscricaoIds.length === 0) {
      toast.error("Selecione ao menos um participante");
      return;
    }
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "enviar-emergencia-evento",
        {
          body: {
            tipo: "manual",
            eventoId,
            eventoTipo,
            inscritosEventoId,
            inscritosEventoTipo,
            inscricaoId: destino === "um" ? inscricaoId : null,
            inscricaoIds: destino === "selecionados" ? inscricaoIds : null,
            nomeGenerico: destino === "selecionados",
            mensagemOverride: mensagem,
            midiaUrl: anexo?.url || null,
            midiaFileName: anexo?.fileName || null,
            destinatarioTipo: contatoTipo,
            tipoMensagem:
              (templateSel ? templateSel.split(":").pop() : "") ||
              (contatoTipo === "emergencia"
                ? "contato_emergencia"
                : "aviso_importante"),
            tipoInscricaoFiltro:
              destino === "todos" && tiposFiltro.length > 0 ? tiposFiltro : null,
          },
        },
      );
      if (error) throw error;
      toast.success(
        `Envio concluído: ${data?.enviados || 0} enviados, ${data?.falhas || 0} falhas`,
      );
      onOpenChange(false);
      setMensagem("");
      setInscricaoId("");
      setInscricaoIds([]);
      setTemplateSel("");
      setAnexo(null);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ width: "calc(100vw - 1.5rem)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Enviar WhatsApp
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{eventoTitulo}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Origem dos inscritos</Label>
            <Select
              value={`${inscritosEventoTipo}:${inscritosEventoId}`}
              onValueChange={(v) => {
                const [t, id] = v.split(":");
                setInscritosEventoTipo(t as any);
                setInscritosEventoId(id);
                setInscricaoId("");
                setBusca("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento dos participantes" />
              </SelectTrigger>
              <SelectContent>
                {(eventosOrigem as any[]).map((e) => (
                  <SelectItem key={`${e.tipo}:${e.id}`} value={`${e.tipo}:${e.id}`}>
                    {e.titulo} {e.data ? `(${e.data.split("-").reverse().join("/")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Para PRE-eventos, selecione o evento principal (ex.: PRE IMPACTO FEMININO → Impacto Feminino).
            </p>
          </div>

          <div>
            <Label>Enviar para</Label>
            <RadioGroup
              value={contatoTipo}
              onValueChange={(v: any) => {
                setContatoTipo(v);
                setInscricaoId("");
              }}
              className="mt-2 space-y-2"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="principal" id="c-principal" />
                <span>Contato principal do participante</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="emergencia" id="c-emerg" />
                <span>Contato de emergência</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label>Destinatários</Label>
            <RadioGroup value={destino} onValueChange={(v: any) => setDestino(v)} className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="todos" id="r-todos" />
                <span>Todos os participantes ({totalComTelefone} com telefone válido)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="um" id="r-um" />
                <span>Selecionar um participante</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="selecionados" id="r-selecionados" />
                <span>Selecionar vários participantes ({inscricaoIds.length} marcados)</span>
              </label>
            </RadioGroup>
          </div>

          {destino === "todos" && (
            <div>
              <Label>Filtrar por tipo de inscrição (opcional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { v: "membro", l: "Membros" },
                  { v: "nao_membro", l: "Não membros" },
                  { v: "equipe", l: "Equipe/Apoio" },
                  { v: "ministrador", l: "Ministradores" },
                ].map((opt) => {
                  const ativo = tiposFiltro.includes(opt.v);
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() =>
                        setTiposFiltro((prev) =>
                          prev.includes(opt.v)
                            ? prev.filter((x) => x !== opt.v)
                            : [...prev, opt.v],
                        )
                      }
                      className={`px-3 py-1 rounded-full border text-xs ${ativo ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted"}`}
                    >
                      {opt.l}
                    </button>
                  );
                })}
                {tiposFiltro.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTiposFiltro([])}
                    className="text-xs text-muted-foreground underline ml-1"
                  >
                    limpar
                  </button>
                )}
              </div>
            </div>
          )}

          {destino === "um" && (
            <div className="space-y-2">
              {inscricaoId ? (() => {
                const sel = (filtradas as any[]).find((x: any) => x.id === inscricaoId)
                  || ({} as any);
                const tel = telefoneDe(sel);
                return (
                  <div className="flex items-center justify-between gap-3 border rounded-md p-3 bg-primary/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sel.nome || "Participante selecionado"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contatoTipo === "emergencia"
                          ? `${sel.nome_responsavel || "—"} • ${tel ? formatPhone(tel) : "sem telefone"}`
                          : tel ? formatPhone(tel) : "sem telefone"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setInscricaoId(null as any); setBusca(""); }}
                    >
                      Trocar
                    </Button>
                  </div>
                );
              })() : (
              <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar participante ou contato..."
                  className="pl-9"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {filtradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nenhum resultado</p>
                ) : (
                  filtradas.map((i: any) => {
                    const tel = telefoneDe(i);
                    const valid = (tel || "").replace(/\D/g, "").length >= 10;
                    return (
                      <button
                        key={i.id}
                        type="button"
                        disabled={!valid}
                        onClick={() => { setInscricaoId(i.id); setBusca(""); }}
                        className={`w-full text-left p-2 border-b last:border-b-0 hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed ${inscricaoId === i.id ? "bg-primary/10" : ""}`}
                      >
                        <p className="text-sm font-medium">{i.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {contatoTipo === "emergencia"
                            ? `${i.nome_responsavel || "—"} • ${tel ? formatPhone(tel) : "sem telefone"}`
                            : tel ? formatPhone(tel) : "sem telefone"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
              </>
              )}
            </div>
          )}

          {destino === "selecionados" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar participante ou contato..."
                  className="pl-9"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{inscricaoIds.length} de {(filtradas as any[]).length} selecionados</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      const validos = (filtradas as any[])
                        .filter((i: any) => (telefoneDe(i) || "").replace(/\D/g, "").length >= 10)
                        .map((i: any) => i.id);
                      setInscricaoIds(Array.from(new Set([...inscricaoIds, ...validos])));
                    }}
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setInscricaoIds([])}
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {filtradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nenhum resultado</p>
                ) : (
                  (filtradas as any[]).map((i: any) => {
                    const tel = telefoneDe(i);
                    const valid = (tel || "").replace(/\D/g, "").length >= 10;
                    const checked = inscricaoIds.includes(i.id);
                    return (
                      <label
                        key={i.id}
                        className={`flex items-center gap-2 w-full text-left p-2 border-b last:border-b-0 hover:bg-muted/60 ${!valid ? "opacity-50" : "cursor-pointer"}`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!valid}
                          onCheckedChange={(v) => {
                            setInscricaoIds((prev) =>
                              v ? [...prev, i.id] : prev.filter((x) => x !== i.id),
                            );
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{i.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contatoTipo === "emergencia"
                              ? `${i.nome_responsavel || "—"} • ${tel ? formatPhone(tel) : "sem telefone"}`
                              : tel ? formatPhone(tel) : "sem telefone"}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                A mensagem usará <strong>"Querido(a) Participante"</strong> no lugar de {"{NOME}"} / {"{NOME_COMPLETO}"}.
              </p>
            </div>
          )}

          <div>
            <Label>Mensagem</Label>
            {templates.length > 0 ? (
              <Select
                value={templateSel}
                onValueChange={(v) => {
                  setTemplateSel(v);
                  const t = (templates as any[]).find(
                    (x) => `${x.evento_tipo}:${x.evento_id}:${x.tipo_mensagem}` === v,
                  );
                  if (t) setMensagem(t.mensagem || "");
                }}
              >
                <SelectTrigger className="mb-2">
                  <SelectValue placeholder="Usar modelo salvo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {(templates as any[]).map((t) => {
                    const k = `${t.evento_tipo}:${t.evento_id}:${t.tipo_mensagem}`;
                    return (
                      <SelectItem key={k} value={k}>
                        {(TIPO_LABELS[t.tipo_mensagem] || t.tipo_mensagem) +
                          " — " +
                          (t.evento_titulo || "—")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground mb-2 bg-muted/40 border rounded p-2">
                Nenhum modelo salvo encontrado para este evento. Configure em
                <strong> Gerenciar Homepage → Configurações → Mensagens do evento</strong>.
              </p>
            )}
            <Textarea
              rows={8}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem ou use a configurada"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Placeholders: {"{NOME}"}, {"{NOME_COMPLETO}"}, {"{NOME_EMERGENCIA}"}, {"{EVENTO}"}, {"{DATA_EVENTO}"}
            </p>
          </div>

          <WhatsappAnexoUpload value={anexo} onChange={setAnexo} disabled={enviando} />

          {destino === "todos" && totalComTelefone > 1 && (
            <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-2">
              ⚠️ Os envios são espaçados aleatoriamente em 15–30 segundos para evitar bloqueio. O processo pode demorar alguns minutos.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={handleEnviar} disabled={enviando}>
            {enviando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}