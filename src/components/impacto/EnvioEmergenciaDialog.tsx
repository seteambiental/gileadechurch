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

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  eventoId: string;
  eventoTipo: "impacto" | "agenda";
  eventoTitulo: string;
}

export default function EnvioEmergenciaDialog({
  open,
  onOpenChange,
  eventoId,
  eventoTipo,
  eventoTitulo,
}: Props) {
  const [destino, setDestino] = useState<"todos" | "um">("todos");
  const [contatoTipo, setContatoTipo] = useState<"principal" | "emergencia">("principal");
  const [inscricaoId, setInscricaoId] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

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

  useMemo(() => {
    if (open && cfg && !mensagem) setMensagem(cfg.mensagem_inicial || "");
  }, [cfg, open]);

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["emerg-dialog-inscricoes", eventoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("impacto_inscricoes")
        .select("id, nome, telefone, telefone_emergencia, telefone_responsavel, nome_responsavel")
        .eq("evento_id", eventoId)
        .neq("status_pagamento", "cancelado")
        .order("nome");
      return data || [];
    },
    enabled: open && !!eventoId,
  });

  const filtradas = useMemo(() => {
    if (!busca) return inscricoes;
    const q = busca.toLowerCase();
    return inscricoes.filter(
      (i: any) =>
        i.nome?.toLowerCase().includes(q) ||
        i.nome_responsavel?.toLowerCase().includes(q),
    );
  }, [inscricoes, busca]);

  const telefoneDe = (i: any) =>
    contatoTipo === "principal"
      ? i.telefone || ""
      : i.telefone_emergencia || i.telefone_responsavel || "";

  const totalComTelefone = inscricoes.filter(
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
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "enviar-emergencia-evento",
        {
          body: {
            tipo: "manual",
            eventoId,
            eventoTipo,
            inscricaoId: destino === "um" ? inscricaoId : null,
            mensagemOverride: mensagem,
            destinatarioTipo: contatoTipo,
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
            </RadioGroup>
          </div>

          {destino === "um" && (
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
                        onClick={() => setInscricaoId(i.id)}
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
            </div>
          )}

          <div>
            <Label>Mensagem</Label>
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