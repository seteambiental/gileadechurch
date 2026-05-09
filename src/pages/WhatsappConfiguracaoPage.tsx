import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Phone,
  Server,
  Loader2,
  Activity,
  Settings2,
  Save,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import EmergenciaConfigCard from "@/components/configuracoes/EmergenciaConfigCard";

interface StatusResponse {
  provider: string;
  configured: boolean;
  connected: boolean;
  state?: string;
  instance_name?: string;
  api_host?: string;
  owner_number?: string | null;
  owner_name?: string | null;
  latency_ms?: number;
  missing?: string[];
  message?: string;
  error?: string;
  checked_at: string;
  last_response_body?: any;
}

interface FilaConfig {
  batch_size: number;
  delay_min_seconds: number;
  delay_max_seconds: number;
  max_tentativas: number;
  backoff_base_minutes: number;
  backoff_factor: number;
}

const DEFAULTS: FilaConfig = {
  batch_size: 6,
  delay_min_seconds: 5,
  delay_max_seconds: 15,
  max_tentativas: 3,
  backoff_base_minutes: 1,
  backoff_factor: 5,
};

function formatPhone(p?: string | null) {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const num = d.slice(4);
    if (num.length === 9) return `+55 (${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    if (num.length === 8) return `+55 (${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }
  return p;
}

export default function WhatsappConfiguracaoPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [testTelefone, setTestTelefone] = useState("");
  const [testMensagem, setTestMensagem] = useState(
    "🔧 Teste de conexão Gileade Church.\n\nSe você recebeu esta mensagem, a integração está funcionando! ✅",
  );
  const [testando, setTestando] = useState(false);
  const [historico, setHistorico] = useState<
    { ok: boolean; at: string; message: string }[]
  >([]);

  // ====== STATUS ======
  const {
    data: status,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useQuery<StatusResponse>({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-status", {
        body: {},
      });
      if (error) throw error;
      return data as StatusResponse;
    },
    refetchInterval: autoRefresh ? 15_000 : false,
    refetchOnWindowFocus: false,
  });

  // ====== CONFIG DA FILA ======
  const { data: cfgRow, isLoading: loadingCfg } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_config" as any)
        .select("*")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || null;
    },
  });

  const [cfg, setCfg] = useState<FilaConfig>(DEFAULTS);

  useEffect(() => {
    if (cfgRow) {
      setCfg({
        batch_size: cfgRow.batch_size ?? DEFAULTS.batch_size,
        delay_min_seconds: cfgRow.delay_min_seconds ?? DEFAULTS.delay_min_seconds,
        delay_max_seconds: cfgRow.delay_max_seconds ?? DEFAULTS.delay_max_seconds,
        max_tentativas: cfgRow.max_tentativas ?? DEFAULTS.max_tentativas,
        backoff_base_minutes:
          cfgRow.backoff_base_minutes ?? DEFAULTS.backoff_base_minutes,
        backoff_factor: Number(cfgRow.backoff_factor ?? DEFAULTS.backoff_factor),
      });
    }
  }, [cfgRow]);

  const dirty = useMemo(() => {
    if (!cfgRow) return false;
    return (
      cfg.batch_size !== cfgRow.batch_size ||
      cfg.delay_min_seconds !== cfgRow.delay_min_seconds ||
      cfg.delay_max_seconds !== cfgRow.delay_max_seconds ||
      cfg.max_tentativas !== cfgRow.max_tentativas ||
      cfg.backoff_base_minutes !== cfgRow.backoff_base_minutes ||
      Number(cfg.backoff_factor) !== Number(cfgRow.backoff_factor)
    );
  }, [cfg, cfgRow]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validação cliente
      if (cfg.delay_min_seconds < 1 || cfg.delay_max_seconds > 120)
        throw new Error("Delays devem estar entre 1 e 120 segundos");
      if (cfg.delay_max_seconds < cfg.delay_min_seconds)
        throw new Error("Delay máximo não pode ser menor que o mínimo");
      if (cfg.batch_size < 1 || cfg.batch_size > 50)
        throw new Error("Lote deve estar entre 1 e 50");
      if (cfg.max_tentativas < 1 || cfg.max_tentativas > 10)
        throw new Error("Tentativas: 1 a 10");

      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("whatsapp_config" as any)
        .update({
          ...cfg,
          updated_by: u.user?.id ?? null,
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["whatsapp-config"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao salvar"),
  });

  function resetDefaults() {
    setCfg(DEFAULTS);
  }

  // ====== TESTE DE ENVIO ======
  async function handleTeste() {
    const telefone = testTelefone.replace(/\D/g, "");
    if (telefone.length < 10) {
      toast.error("Informe um telefone válido (com DDD).");
      return;
    }
    if (!testMensagem.trim()) return toast.error("Mensagem vazia.");
    setTestando(true);
    const startedAt = new Date().toISOString();
    try {
      const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
        body: { action: "mensagem_direta", telefone, mensagem: testMensagem },
      });
      if (error) throw error;
      const ok = !!data?.success;
      setHistorico((h) =>
        [
          {
            ok,
            at: startedAt,
            message: ok
              ? "Mensagem enviada com sucesso."
              : data?.error || "Falha no envio.",
          },
          ...h,
        ].slice(0, 10),
      );
      ok ? toast.success("Mensagem de teste enviada") : toast.error("Falha");
    } catch (err: any) {
      setHistorico((h) =>
        [{ ok: false, at: startedAt, message: err?.message || "Erro" }, ...h].slice(
          0,
          10,
        ),
      );
      toast.error(err?.message || "Erro");
    } finally {
      setTestando(false);
    }
  }

  async function processarAgora() {
    try {
      const { data, error } = await supabase.functions.invoke(
        "processar-fila-whatsapp",
        { body: {} },
      );
      if (error) throw error;
      toast.success(
        `Processados: ${data?.processados ?? 0} (enviados: ${data?.enviados ?? 0}, erros: ${data?.erros_reagendados ?? 0}, descartados: ${data?.descartados ?? 0})`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar fila");
    }
  }

  const statusBadge = useMemo(() => {
    if (isLoading)
      return (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Verificando…
        </Badge>
      );
    if (!status?.configured)
      return (
        <Badge className="gap-1.5 bg-amber-500 hover:bg-amber-500/90 text-white">
          <AlertTriangle className="w-3 h-3" /> Não configurado
        </Badge>
      );
    if (status.connected)
      return (
        <Badge className="gap-1.5 bg-green-600 hover:bg-green-600/90 text-white">
          <CheckCircle2 className="w-3 h-3" /> Conectado
        </Badge>
      );
    return (
      <Badge variant="destructive" className="gap-1.5">
        <XCircle className="w-3 h-3" /> Desconectado
      </Badge>
    );
  }, [isLoading, status]);

  // Exemplos calculados
  const exemplosBackoff = useMemo(() => {
    const b = Math.max(1, cfg.backoff_base_minutes);
    const f = Math.max(1, cfg.backoff_factor);
    return Array.from({ length: Math.max(1, cfg.max_tentativas - 1) }, (_, i) => {
      const min = b * Math.pow(f, i);
      return { tentativa: i + 1, minutos: min };
    });
  }, [cfg]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Configuração do WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              Provedor, conexão, fila de envios e teste em tempo real
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Status */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" /> Status da conexão
              </CardTitle>
              {statusBadge}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <strong>Falha ao consultar status:</strong>{" "}
                {(error as Error)?.message || "Erro desconhecido"}
              </div>
            )}

            {status && !status.configured && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium mb-1">Variáveis de ambiente faltando</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {(status.missing || []).map((m) => (
                    <li key={m}>
                      <code>{m}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {status && status.configured && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow icon={<Server className="w-4 h-4" />} label="Provedor" value={status.provider} />
                <InfoRow icon={<Server className="w-4 h-4" />} label="Servidor" value={status.api_host || "—"} mono />
                <InfoRow icon={<Server className="w-4 h-4" />} label="Instância" value={status.instance_name || "—"} mono />
                <InfoRow
                  icon={<Phone className="w-4 h-4" />}
                  label="Número remetente"
                  value={
                    status.owner_number
                      ? formatPhone(status.owner_number)
                      : status.connected
                        ? status.owner_name || "—"
                        : "(indisponível: desconectado)"
                  }
                  mono={!!status.owner_number}
                />
                <InfoRow icon={<CheckCircle2 className="w-4 h-4" />} label="Estado" value={status.state || "—"} mono />
                <InfoRow
                  icon={<Activity className="w-4 h-4" />}
                  label="Latência"
                  value={status.latency_ms !== undefined ? `${status.latency_ms} ms` : "—"}
                />
              </div>
            )}

            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Última verificação:{" "}
                {status?.checked_at ? new Date(status.checked_at).toLocaleString("pt-BR") : "—"}
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Atualizar automaticamente (15s)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* CONFIGURAÇÃO DA FILA */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-600" />
                Parâmetros da fila
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetDefaults}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Padrão
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending || loadingCfg}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NumberField
                label="Lote por execução"
                hint="Quantas mensagens enviar por ciclo (1–50)"
                value={cfg.batch_size}
                min={1}
                max={50}
                onChange={(v) => setCfg({ ...cfg, batch_size: v })}
              />
              <NumberField
                label="Tentativas máximas"
                hint="Antes de descartar a mensagem (1–10)"
                value={cfg.max_tentativas}
                min={1}
                max={10}
                onChange={(v) => setCfg({ ...cfg, max_tentativas: v })}
              />
              <NumberField
                label="Backoff base (min)"
                hint="Espera após a 1ª falha"
                value={cfg.backoff_base_minutes}
                min={1}
                max={60}
                onChange={(v) => setCfg({ ...cfg, backoff_base_minutes: v })}
              />
              <NumberField
                label="Espaçamento mín. (s)"
                hint="Tempo mínimo entre mensagens"
                value={cfg.delay_min_seconds}
                min={1}
                max={120}
                onChange={(v) => setCfg({ ...cfg, delay_min_seconds: v })}
              />
              <NumberField
                label="Espaçamento máx. (s)"
                hint="Tempo máximo entre mensagens"
                value={cfg.delay_max_seconds}
                min={1}
                max={120}
                onChange={(v) => setCfg({ ...cfg, delay_max_seconds: v })}
              />
              <NumberField
                label="Fator de backoff"
                hint="Multiplica a espera a cada nova falha"
                value={cfg.backoff_factor}
                min={1}
                max={20}
                onChange={(v) => setCfg({ ...cfg, backoff_factor: v })}
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
              <p className="font-medium text-foreground">Pré-visualização</p>
              <p className="text-muted-foreground">
                Cada execução envia até <strong>{cfg.batch_size}</strong> mensagens com
                espaçamento aleatório de{" "}
                <strong>
                  {cfg.delay_min_seconds}–{cfg.delay_max_seconds}s
                </strong>{" "}
                entre cada uma.
              </p>
              <p className="text-muted-foreground">
                Em caso de falha, as próximas tentativas acontecem em:{" "}
                {exemplosBackoff
                  .map((b) =>
                    b.minutos >= 60
                      ? `${(b.minutos / 60).toFixed(1)}h`
                      : `${b.minutos}min`,
                  )
                  .join(" → ")}
                {" "}
                — depois descartada.
              </p>
            </div>

            <Separator />
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={processarAgora}>
                <Send className="w-4 h-4 mr-2" />
                Processar fila agora
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TESTE DE ENVIO */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" /> Enviar mensagem de teste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 space-y-2">
                <Label htmlFor="tel">Telefone (com DDD)</Label>
                <Input
                  id="tel"
                  placeholder="11999999999"
                  value={testTelefone}
                  onChange={(e) => setTestTelefone(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="msg">Mensagem</Label>
                <Textarea
                  id="msg"
                  rows={3}
                  value={testMensagem}
                  onChange={(e) => setTestMensagem(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleTeste}
                disabled={testando || !status?.connected}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {testando ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar teste
              </Button>
            </div>

            {historico.length > 0 && (
              <div className="space-y-2">
                <Label>Resultados recentes</Label>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {historico.map((h, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-2.5 text-xs ${
                        h.ok
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-destructive/40 bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          {h.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          )}
                          {h.ok ? "Sucesso" : "Falha"}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(h.at).toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-muted-foreground break-words">{h.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <EmergenciaConfigCard />
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}