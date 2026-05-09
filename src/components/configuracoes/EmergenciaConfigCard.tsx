import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/date-utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Save, Loader2 } from "lucide-react";

type Cfg = {
  evento_id: string;
  evento_tipo: "impacto" | "agenda";
  mensagem_inicial: string;
  mensagem_recorrente: string;
  enviar_recorrente: boolean;
  frequencia_dias: number;
  data_inicio_recorrencia: string | null;
};

const DEFAULT_INICIAL =
  "🙏 Olá, {NOME_EMERGENCIA}!\n\nSomos da Gileade Church. Estamos confirmando que {NOME_COMPLETO} foi inscrito(a) em *{EVENTO}* ({DATA_EVENTO}) e indicou você como contato de emergência.\n\nQualquer necessidade, entraremos em contato por este número.\n\n_Igreja Gileade_";
const DEFAULT_RECORRENTE =
  "🙏 Olá, {NOME_EMERGENCIA}!\n\nLembrete: {NOME} estará no evento *{EVENTO}* em {DATA_EVENTO}. Qualquer urgência, contaremos com seu apoio como contato de emergência.\n\n_Igreja Gileade_";

export default function EmergenciaConfigCard() {
  const qc = useQueryClient();
  const [eventoSel, setEventoSel] = useState<string>("");

  const { data: eventosImpacto = [] } = useQuery({
    queryKey: ["cfg-emerg-impacto-eventos"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("impacto_eventos")
        .select("id, titulo, data_inicio, data_fim, finalizado")
        .eq("ativo", true)
        .eq("finalizado", false)
        .gte("data_fim", today)
        .order("data_inicio");
      return data || [];
    },
  });

  const { data: eventosAgenda = [] } = useQuery({
    queryKey: ["cfg-emerg-agenda-eventos"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("agenda_igreja")
        .select("id, titulo, data_evento, data_fim")
        .eq("necessita_inscricao", true)
        .eq("recorrente", false)
        .eq("ativo", true)
        .gte("data_evento", today)
        .order("data_evento");
      return data || [];
    },
  });

  const eventos = useMemo(() => {
    const a = eventosImpacto.map((e: any) => ({
      key: `impacto:${e.id}`,
      id: e.id,
      tipo: "impacto" as const,
      titulo: e.titulo,
      data: e.data_inicio,
    }));
    const b = eventosAgenda.map((e: any) => ({
      key: `agenda:${e.id}`,
      id: e.id,
      tipo: "agenda" as const,
      titulo: e.titulo,
      data: e.data_evento,
    }));
    return [...a, ...b].sort(
      (x, y) => new Date(x.data).getTime() - new Date(y.data).getTime(),
    );
  }, [eventosImpacto, eventosAgenda]);

  const eventoAtivo = eventos.find((e) => e.key === eventoSel);

  const { data: cfgRow, refetch } = useQuery({
    queryKey: ["emerg-cfg", eventoSel],
    queryFn: async () => {
      if (!eventoAtivo) return null;
      const { data } = await supabase
        .from("evento_emergencia_config")
        .select("*")
        .eq("evento_id", eventoAtivo.id)
        .eq("evento_tipo", eventoAtivo.tipo)
        .maybeSingle();
      return data as Cfg | null;
    },
    enabled: !!eventoAtivo,
  });

  const [form, setForm] = useState<Cfg>({
    evento_id: "",
    evento_tipo: "impacto",
    mensagem_inicial: DEFAULT_INICIAL,
    mensagem_recorrente: DEFAULT_RECORRENTE,
    enviar_recorrente: false,
    frequencia_dias: 7,
    data_inicio_recorrencia: null,
  });

  useEffect(() => {
    if (!eventoAtivo) return;
    if (cfgRow) {
      setForm({
        evento_id: cfgRow.evento_id,
        evento_tipo: cfgRow.evento_tipo,
        mensagem_inicial: cfgRow.mensagem_inicial || DEFAULT_INICIAL,
        mensagem_recorrente: cfgRow.mensagem_recorrente || DEFAULT_RECORRENTE,
        enviar_recorrente: !!cfgRow.enviar_recorrente,
        frequencia_dias: cfgRow.frequencia_dias || 7,
        data_inicio_recorrencia: cfgRow.data_inicio_recorrencia,
      });
    } else {
      setForm({
        evento_id: eventoAtivo.id,
        evento_tipo: eventoAtivo.tipo,
        mensagem_inicial: DEFAULT_INICIAL,
        mensagem_recorrente: DEFAULT_RECORRENTE,
        enviar_recorrente: false,
        frequencia_dias: 7,
        data_inicio_recorrencia: null,
      });
    }
  }, [cfgRow, eventoAtivo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!eventoAtivo) throw new Error("Selecione um evento");
      const payload = {
        ...form,
        evento_id: eventoAtivo.id,
        evento_tipo: eventoAtivo.tipo,
      };
      const { error } = await supabase
        .from("evento_emergencia_config")
        .upsert(payload, { onConflict: "evento_id,evento_tipo" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["emerg-cfg"] });
      refetch();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          Mensagens — Contato de Emergência
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure as mensagens enviadas ao contato de emergência dos
          participantes. Placeholders: <code>{"{NOME}"}</code>,{" "}
          <code>{"{NOME_COMPLETO}"}</code>, <code>{"{NOME_EMERGENCIA}"}</code>,{" "}
          <code>{"{EVENTO}"}</code>, <code>{"{DATA_EVENTO}"}</code>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Evento</Label>
          <Select value={eventoSel} onValueChange={setEventoSel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um evento futuro/em andamento" />
            </SelectTrigger>
            <SelectContent>
              {eventos.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  Nenhum evento ativo
                </SelectItem>
              )}
              {eventos.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {format(parseLocalDate(e.data), "dd/MM", { locale: ptBR })} —{" "}
                  {e.titulo} ({e.tipo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {eventoAtivo && (
          <>
            <div>
              <Label>Mensagem inicial (na confirmação da inscrição)</Label>
              <Textarea
                rows={6}
                value={form.mensagem_inicial}
                onChange={(e) =>
                  setForm({ ...form, mensagem_inicial: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.enviar_recorrente}
                onCheckedChange={(v) =>
                  setForm({ ...form, enviar_recorrente: v })
                }
              />
              <Label className="!m-0">
                Enviar mensagens recorrentes até o evento
              </Label>
            </div>

            {form.enviar_recorrente && (
              <>
                <div>
                  <Label>Mensagem recorrente</Label>
                  <Textarea
                    rows={6}
                    value={form.mensagem_recorrente}
                    onChange={(e) =>
                      setForm({ ...form, mensagem_recorrente: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Frequência (dias)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={form.frequencia_dias}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          frequencia_dias: parseInt(e.target.value) || 7,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Início da recorrência</Label>
                    <Input
                      type="date"
                      value={form.data_inicio_recorrencia || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          data_inicio_recorrencia: e.target.value || null,
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar configuração
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Após o término do evento, todos os envios são automaticamente
              bloqueados.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}